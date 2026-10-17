import "server-only";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";
import { renderPersonaMarkdown } from "@/lib/persona/markdown";
import type { PersonaDoc } from "@/lib/persona/schema";
import { lt, type LText } from "@/lib/persona/text";
import { chatModelId, google } from "./model";

/**
 * AI helpers for the Persona Studio. They only ever write into the draft, through the same review
 * steps as a hand-made change (the Markdown import preview, or a visible edit), so nothing reaches the
 * site before the owner publishes. Private sections and items are never sent to the model.
 * Each system prompt starts with a "TASK:" line (the e2e fake model routes on it).
 */

const TIMEOUT_MS = 60_000;

const TEMPLATE_GUIDE = `THE TEMPLATE (Markdown):
## <Section title> (<display>) [<visibility>] {<key>}
  display: facts | paragraphs | list | timeline | tags | gallery | quotes
  visibility: public (anyone) | unlocked (only people the owner gave an access code) | private (never shown to visitors)
  facts:      - Label: value
  paragraphs: plain paragraphs separated by one blank line
  list:       - text
  timeline:   - period | title | organisation or place | detail | detail   (write ? when there is no period)
  tags:       - Group name: tag, tag, tag
  gallery:    - /images/file.webp | caption
  quotes:     - the quote | who said it | their role
  A value that must be more private than its section starts with [unlocked] or [private]: "- Phone: [unlocked] +880 ...".
  Bangla: write "English || বাংলা" wherever a text appears, when a Bangla version is wanted.
## Questions
### <Short button label> {<id: lowercase-with-dashes>}
Prompt: <the question as a visitor would type it>
Keywords: word, word, word   (words and short phrases visitors use, English and Bangla)
Answer: <a short first-person answer; **bold** allowed>
Shows: <keys of the sections to show as cards under the answer>
Follow-ups: <ids of up to 3 other questions>`;

/** Knowledge the helpers may see: public and unlocked sections and items only. */
function shareable(doc: PersonaDoc): PersonaDoc {
  return {
    ...doc,
    sections: doc.sections
      .filter((s) => s.visibility !== "private")
      .map((s) => ({ ...s, items: s.items.filter((it) => it.visibility !== "private") })),
  };
}

async function call<T>(opts: { system: string; prompt: string; schema?: z.ZodType<T>; maxOutputTokens: number; temperature?: number }): Promise<{ text: string; output?: T }> {
  const run = (thinkingOff: boolean) =>
    generateText({
      model: google()(chatModelId()),
      system: opts.system,
      prompt: opts.prompt,
      ...(opts.schema ? { output: Output.object({ schema: opts.schema }) } : {}),
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      providerOptions: thinkingOff ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined,
    });
  let res: Awaited<ReturnType<typeof run>>;
  try {
    res = await run(true);
  } catch (err) {
    if (APICallError.isInstance(err) && err.statusCode === 400) res = await run(false);
    else throw err;
  }
  return { text: res.text, output: opts.schema ? (res.output as T) : undefined };
}

/** Drops a ```markdown fence the model may wrap its answer in. */
const unfence = (text: string) => text.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n```\s*$/, "").trim();

const sectionList = (doc: PersonaDoc) =>
  doc.sections.map((s) => `- {${s.key}} ${lt(s.title, "en")} (${s.display}) [${s.visibility}]`).join("\n") || "(none yet)";

/**
 * Free text (an old biodata, notes, a chat message; English or Bangla) -> the template, for the
 * import preview. Only facts from the text; sensitive details default to [unlocked].
 */
export async function structureText(doc: PersonaDoc, text: string): Promise<string> {
  const bangla = doc.site.languages.includes("bn");
  const system = `TASK: structure
You turn notes about a person into the template below, for their personal website "${doc.name}". Output ONLY the Markdown, no comments.

${TEMPLATE_GUIDE}

RULES
- Use only facts that are in the notes. Never invent or guess. Leave out what the notes don't say.
- Reuse an existing section (same {key}) when the facts belong there. Existing sections:
${sectionList(doc)}
- Exact addresses, phone numbers, email addresses, family members' names and income are [unlocked] unless the notes say they are public. Health matters and anything the notes call private are [private].
- Keep the owner's wording where it is good; fix spelling. Write in the first person where it is the owner speaking.
- ${bangla ? 'The site is in English and Bangla: give every label and value both, as "English || বাংলা" (translate faithfully; keep names, numbers and places as they are).' : "The site is in English: translate any Bangla into English."}
- Add a "## Questions" part only if the notes contain questions and answers.`;
  const { text: out } = await call({ system, prompt: text.slice(0, 20_000), maxOutputTokens: 6000, temperature: 0.2 });
  return unfence(out);
}

/** Questions visitors are likely to ask that the persona doesn't answer yet, in the template format. */
export async function suggestQuestions(doc: PersonaDoc, count = 8): Promise<string> {
  const known = shareable(doc);
  const bangla = doc.site.languages.includes("bn");
  const system = `TASK: suggest-questions
You help the owner of a personal website ("${doc.name}") prepare for what visitors ask. The site answers in the owner's voice from the knowledge below.

${TEMPLATE_GUIDE}

RULES
- Suggest ${count} NEW questions visitors of this site are likely to ask that the existing questions don't cover.
- Answer each one ONLY from the knowledge; when the knowledge has no answer, write "Answer: TODO" so the owner fills it in.
- "Shows:" lists section keys that support the answer (sections marked [unlocked] only for questions about unlocked details).
- ${bangla ? 'Give labels, prompts and answers in English and Bangla ("English || বাংলা"); add Bangla keywords too.' : "Write in English."}
- Output ONLY the "## Questions" part of the template.

EXISTING QUESTIONS
${doc.questions.map((q) => `- {${q.id}} ${lt(q.label, "en")}: ${lt(q.prompt, "en")}`).join("\n") || "(none)"}

KNOWLEDGE
${renderPersonaMarkdown(known, doc.name)}`;
  const { text: out } = await call({ system, prompt: `Suggest ${count} questions.`, maxOutputTokens: 5000, temperature: 0.5 });
  return unfence(out);
}

const DraftSchema = z.object({ en: z.string(), bn: z.string().optional() });

/** A first-person answer to one question, from the knowledge only (Bangla too when the site has it). */
export async function draftAnswer(doc: PersonaDoc, question: { label: string; prompt: string }): Promise<{ en: string; bn?: string }> {
  const known = shareable(doc);
  const bangla = doc.site.languages.includes("bn");
  const system = `TASK: draft-answer
You write the owner's answer to a question on their personal website ("${doc.name}"), in their voice: ${lt(doc.rules.voice, "en")}
Use ONLY the knowledge below. If it doesn't answer the question, say briefly what is missing in "en" starting with "TODO:".
Keep it under ${doc.rules.maxWords} words; **bold** for the key fact is allowed; no lists or headings.
${bangla ? 'Also give a natural Bangla version in "bn".' : 'Leave "bn" empty.'}

KNOWLEDGE
${renderPersonaMarkdown(known, doc.name)}`;
  const { output } = await call({ system, prompt: `Question: ${question.label}\nAs a visitor would ask it: ${question.prompt}`, schema: DraftSchema, maxOutputTokens: 1200 });
  const en = output?.en?.trim() ?? "";
  const bn = output?.bn?.trim();
  return bangla && bn ? { en, bn } : { en };
}

// ---------- missing Bangla ----------

export type Path = (string | number)[];
export type MissingText = { path: Path; en: string };

/** Every visible English text without a Bangla version (private parts and the AI rules excluded). */
export function missingBangla(doc: PersonaDoc): MissingText[] {
  const out: MissingText[] = [];
  const add = (path: Path, t: LText | undefined) => {
    if (t === undefined) return;
    const en = typeof t === "string" ? t : t.en;
    const bn = typeof t === "string" ? "" : (t.bn ?? "");
    if (en.trim() && !bn.trim() && /[A-Za-z]/.test(en)) out.push({ path, en });
  };
  const id = doc.identity;
  (["role", "headline", "location", "summary"] as const).forEach((k) => add(["identity", k], id[k]));
  if (id.avatar) add(["identity", "avatar", "alt"], id.avatar.alt);
  id.photos.forEach((p, i) => p.visibility !== "private" && add(["identity", "photos", i, "alt"], p.alt));
  add(["site", "title"], doc.site.title);
  add(["site", "description"], doc.site.description);
  for (const [k, v] of Object.entries(doc.labels)) add(["labels", k], v);
  add(["hero", "staticIntro"], doc.hero.staticIntro);
  doc.hero.pools.forEach((p, i) => p.lines.forEach((l, j) => add(["hero", "pools", i, "lines", j], l)));
  doc.sections.forEach((s, i) => {
    if (s.visibility === "private") return;
    add(["sections", i, "title"], s.title);
    s.items.forEach((it, j) => {
      if (it.visibility === "private") return;
      const base: Path = ["sections", i, "items", j];
      (["label", "value", "text", "meta"] as const).forEach((k) => add([...base, k], it[k]));
      it.details?.forEach((d, k) => add([...base, "details", k], d));
      it.sub?.forEach((sub, k) => {
        add([...base, "sub", k, "title"], sub.title);
        add([...base, "sub", k, "meta"], sub.meta);
        sub.details.forEach((d, m) => add([...base, "sub", k, "details", m], d));
      });
    });
  });
  doc.questions.forEach((q, i) => {
    add(["questions", i, "label"], q.label);
    add(["questions", i, "prompt"], q.prompt);
    q.answers.forEach((a, j) => add(["questions", i, "answers", j], a));
  });
  doc.fallback.answers.forEach((a, i) => add(["fallback", "answers", i], a));
  doc.sidebar.forEach((g, i) => add(["sidebar", i, "title"], g.title));
  add(["document", "title"], doc.document.title);
  add(["access", "requestIntro"], doc.access.requestIntro);
  add(["access", "codeHint"], doc.access.codeHint);
  return out;
}

const TranslationSchema = z.object({ items: z.array(z.object({ n: z.number(), bn: z.string() })) });

/** Bangla for the given texts, in batches; returns only the ones the model translated. */
export async function translateToBangla(doc: PersonaDoc, texts: MissingText[], max = 240): Promise<{ path: Path; en: string; bn: string }[]> {
  const list = texts.slice(0, max);
  const out: { path: Path; en: string; bn: string }[] = [];
  const system = `TASK: translate
You translate texts from a personal website ("${doc.name}") from English into natural, polite Bangla (বাংলা) as used in Bangladesh.
Keep personal names, organisation names, numbers, dates, e-mail addresses and URLs exactly as they are. Keep **bold** marks, {placeholders} and [square brackets] in place.
Return every item with its number "n".`;
  for (let i = 0; i < list.length; i += 60) {
    const batch = list.slice(i, i + 60);
    const prompt = batch.map((t, k) => `${k}: ${JSON.stringify(t.en)}`).join("\n");
    const { output } = await call({ system, prompt, schema: TranslationSchema, maxOutputTokens: 8000, temperature: 0.2 });
    for (const item of output?.items ?? []) {
      const t = batch[item.n];
      if (t && item.bn?.trim()) out.push({ path: t.path, en: t.en, bn: item.bn.trim() });
    }
  }
  return out;
}
