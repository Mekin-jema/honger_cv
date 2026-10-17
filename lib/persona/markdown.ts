import type { LText } from "./text";

/**
 * The persona's knowledge and questions as plain Markdown, so the owner can write or edit them anywhere
 * (a notes app, an email to himself, a chat with an AI) and paste them back into the admin.
 *
 *   ## Personal information || ব্যক্তিগত তথ্য (facts) [public] {personal}
 *   - Height || উচ্চতা: 5'8"
 *   - Present address: [unlocked] House 99, Road 7
 *   ## Education (timeline) [public]
 *   - 2017-2021 | BSc in CSE | North South University | CGPA 3.5
 *   ## About me (paragraphs) [public]
 *   Free text. A blank line starts a new paragraph.
 *   ## Photos (gallery) [unlocked]
 *   - /images/photo.webp | Caption
 *   ## Questions
 *   ### Family || পরিবার {family}
 *   Prompt: Tell me about your family. || আপনার পরিবার সম্পর্কে বলুন।
 *   Keywords: family, parents, পরিবার
 *   Answer: My family: || আমার পরিবার:
 *   Shows: family
 *   Follow-ups: about, contact
 *   Primary: yes
 *
 * "A || B" is English || Bangla. [unlocked] / [private] before a value hides it more than its section.
 * Displays: facts, paragraphs, list, timeline, tags, gallery, quotes. Visibility: public, unlocked, private.
 */

type Vis = "public" | "unlocked" | "private";
type Display = "facts" | "paragraphs" | "list" | "timeline" | "tags" | "gallery" | "quotes";

export type MdItem = {
  id: string;
  label?: LText;
  value?: LText;
  text?: LText;
  meta?: LText;
  period?: string;
  details?: LText[];
  tags?: string[];
  src?: string;
  visibility?: Vis;
};
export type MdSection = { key: string; title: LText; display: Display; visibility: Vis; items: MdItem[] };
export type MdQuestion = {
  id: string;
  label: LText;
  prompt: LText;
  keywords: string[];
  answers: LText[];
  blocks: { kind: "section"; key: string }[];
  followUps: string[];
  primary: boolean;
};
export type MdParse = { sections: MdSection[]; questions: MdQuestion[]; errors: { line: number; message: string }[] };

const DISPLAYS: Display[] = ["facts", "paragraphs", "list", "timeline", "tags", "gallery", "quotes"];
const VIS: Vis[] = ["public", "unlocked", "private"];

export const slugify = (text: string, fallback = "item") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;

/** Inside a one-line field a line break is written as \n, and a " | " that belongs to the text as " \| ". */
const unescapeLine = (s: string) => s.replace(/ \\\| /g, " | ").replace(/\\n/g, "\n");
const escapeLine = (s: string) => s.replace(/\r?\n/g, "\\n").replace(/ \| /g, " \\| ");

/** "English || বাংলা" -> { en, bn }; a plain string stays a string. */
export function parseLText(raw: string): LText {
  const [en, ...rest] = raw.split(" || ");
  const bn = unescapeLine(rest.join(" || ").trim());
  return bn ? { en: unescapeLine(en.trim()), bn } : unescapeLine(en.trim());
}
/** `block` keeps line breaks (paragraphs, answers); the default escapes them for one-line fields. */
export function renderLText(t: LText | undefined, mode: "line" | "block" = "line"): string {
  if (t === undefined) return "";
  const esc = mode === "line" ? escapeLine : (x: string) => x;
  if (typeof t === "string") return esc(t);
  return t.bn?.trim() ? `${esc(t.en)} || ${esc(t.bn)}` : esc(t.en);
}
const enOf = (t: LText | undefined) => (t === undefined ? "" : typeof t === "string" ? t : t.en);

function unique(id: string, used: Set<string>): string {
  let out = id;
  for (let n = 2; used.has(out); n++) out = `${id}-${n}`;
  used.add(out);
  return out;
}

/** "[unlocked] value" -> ["unlocked", "value"]. */
function splitVis(value: string): [Vis | undefined, string] {
  const m = /^\[(public|unlocked|private)\]\s*/i.exec(value);
  return m ? [m[1].toLowerCase() as Vis, value.slice(m[0].length)] : [undefined, value];
}

export function parsePersonaMarkdown(md: string): MdParse {
  const out: MdParse = { sections: [], questions: [], errors: [] };
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let section: (MdSection & { used: Set<string>; para: string[] }) | null = null;
  let inQuestions = false;
  let question: MdQuestion | null = null;
  const sectionKeys = new Set<string>();
  const questionIds = new Set<string>();

  const flushPara = () => {
    if (!section || !section.para.length) return;
    const text = section.para.join("\n").trim();
    section.para = [];
    if (!text) return;
    const [vis, body] = splitVis(text);
    section.items.push({ id: unique(`p${section.items.length + 1}`, section.used), text: parseLText(body), ...(vis ? { visibility: vis } : {}) });
  };
  const closeSection = () => {
    flushPara();
    if (section) out.sections.push({ key: section.key, title: section.title, display: section.display, visibility: section.visibility, items: section.items });
    section = null;
  };
  const closeQuestion = () => {
    if (question) out.questions.push(question);
    question = null;
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trimEnd();
    if (/^#\s/.test(line)) return; // "# Persona: x" title line
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2 && !/^###/.test(line)) {
      closeSection();
      closeQuestion();
      const head = h2[1].trim();
      if (/^questions$/i.test(head)) {
        inQuestions = true;
        return;
      }
      inQuestions = false;
      const key = /\{([a-z0-9-]+)\}\s*$/.exec(head)?.[1];
      const vis = /\[(public|unlocked|private)\]/i.exec(head)?.[1]?.toLowerCase() as Vis | undefined;
      const disp = /\((facts|paragraphs|list|timeline|tags|gallery|quotes)\)/i.exec(head)?.[1]?.toLowerCase() as Display | undefined;
      const title = head
        .replace(/\{[a-z0-9-]+\}\s*$/, "")
        .replace(/\[(public|unlocked|private)\]/i, "")
        .replace(/\((facts|paragraphs|list|timeline|tags|gallery|quotes)\)/i, "")
        .trim();
      if (!title) out.errors.push({ line: n, message: "A section needs a title." });
      const t = parseLText(title || "Untitled");
      section = { key: unique(key ?? slugify(enOf(t), "section"), sectionKeys), title: t, display: disp ?? "facts", visibility: vis ?? "public", items: [], used: new Set(), para: [] };
      return;
    }
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      if (!inQuestions) {
        out.errors.push({ line: n, message: "Questions (### ...) go under a '## Questions' heading." });
        return;
      }
      closeQuestion();
      const head = h3[1].replace(/^Q:\s*/i, "").trim();
      const id = /\{([a-z0-9-]+)\}\s*$/.exec(head)?.[1];
      const label = parseLText(head.replace(/\{[a-z0-9-]+\}\s*$/, "").trim());
      question = { id: unique(id ?? slugify(enOf(label), "question"), questionIds), label, prompt: label, keywords: [], answers: [], blocks: [], followUps: [], primary: false };
      return;
    }
    if (inQuestions) {
      if (!line.trim()) return;
      if (!question) {
        out.errors.push({ line: n, message: "Start each question with '### Label'." });
        return;
      }
      const field = /^(Prompt|Keywords|Answer|Shows|Follow-ups|Followups|Primary):\s*(.*)$/i.exec(line.trim());
      if (!field) {
        // A line without a field name continues the last answer.
        if (question.answers.length) {
          const last = question.answers[question.answers.length - 1];
          question.answers[question.answers.length - 1] = typeof last === "string" ? `${last}\n${line.trim()}` : { ...last, en: `${last.en}\n${line.trim()}` };
        } else question.answers.push(parseLText(line.trim()));
        return;
      }
      const [, name, value] = field;
      const list = () => value.split(",").map((s) => s.trim()).filter(Boolean);
      switch (name.toLowerCase()) {
        case "prompt":
          question.prompt = parseLText(value);
          break;
        case "keywords":
          question.keywords = list();
          break;
        case "answer":
          question.answers.push(parseLText(value));
          break;
        case "shows":
          question.blocks = list().map((key) => ({ kind: "section" as const, key }));
          break;
        case "follow-ups":
        case "followups":
          question.followUps = list();
          break;
        case "primary":
          question.primary = /^(yes|true|1)$/i.test(value.trim());
          break;
      }
      return;
    }
    if (!section) {
      if (line.trim()) out.errors.push({ line: n, message: "Text before the first '## Section' heading is ignored." });
      return;
    }
    const s = section as MdSection & { used: Set<string>; para: string[] };
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (s.display === "paragraphs") {
      if (!line.trim()) flushPara();
      else s.para.push(bullet ? bullet[1] : line.trim());
      return;
    }
    if (!line.trim()) return;
    if (!bullet) {
      out.errors.push({ line: n, message: `In a "${s.display}" section, write each item as "- ...".` });
      return;
    }
    const [vis, body] = splitVis(bullet[1].trim());
    const visProp = vis ? { visibility: vis } : {};
    switch (s.display) {
      case "facts": {
        // "- Label: value", or "- Label:" for one not filled in yet.
        const at = body.endsWith(":") ? body.length - 1 : body.indexOf(": ");
        if (at < 0) {
          out.errors.push({ line: n, message: 'Facts look like "- Label: value".' });
          return;
        }
        const label = parseLText(body.slice(0, at));
        const [vis2, value] = splitVis(body.slice(at + 1).trim());
        s.items.push({ id: unique(slugify(enOf(label)), s.used), label, value: parseLText(value), ...(vis2 ? { visibility: vis2 } : visProp) });
        return;
      }
      case "timeline": {
        let fields = body.split(" | ").map((x) => x.trim());
        // "period | title | place | details". "?" = no period; a first field without digits is the title.
        if (fields[0] === "?" || fields[0] === "") fields[0] = "";
        else if (fields.length > 1 && !/\d/.test(fields[0])) fields = ["", ...fields];
        const [period, title, org, ...rest] = fields;
        const label = parseLText(title ?? period);
        s.items.push({
          id: unique(slugify(enOf(label)), s.used),
          label,
          period: title !== undefined && period ? period : undefined,
          meta: org ? parseLText(org) : undefined,
          details: rest.length ? rest.map(parseLText) : undefined,
          ...visProp,
        });
        return;
      }
      case "tags": {
        const at = body.indexOf(": ");
        const label = at >= 0 ? parseLText(body.slice(0, at)) : undefined;
        const tags = (at >= 0 ? body.slice(at + 2) : body).split(",").map((x) => x.trim()).filter(Boolean);
        s.items.push({ id: unique(slugify(enOf(label) || tags[0] || "tags"), s.used), label, tags, ...visProp });
        return;
      }
      case "gallery": {
        const [src, caption] = body.split(" | ").map((x) => x.trim());
        s.items.push({ id: unique(slugify(src.split("/").pop() ?? "photo"), s.used), src, label: caption ? parseLText(caption) : undefined, ...visProp });
        return;
      }
      case "quotes": {
        const [text, who, role] = body.split(" | ").map((x) => x.trim());
        s.items.push({ id: unique(slugify(who ?? text.slice(0, 24)), s.used), text: parseLText(text), label: who ? parseLText(who) : undefined, meta: role ? parseLText(role) : undefined, ...visProp });
        return;
      }
      default:
        s.items.push({ id: unique(slugify(enOf(parseLText(body)).slice(0, 40)), s.used), text: parseLText(body), ...visProp });
    }
  });
  closeSection();
  closeQuestion();
  for (const q of out.questions) if (!q.answers.length) out.errors.push({ line: 0, message: `Question "${q.id}" has no Answer line.` });
  return out;
}

type DocLike = {
  sections: { key: string; title: LText; display: string; visibility: string; items: (MdItem & { sub?: unknown })[] }[];
  questions: { id: string; label: LText; prompt: LText; keywords: string[]; answers: LText[]; blocks: { kind: string; key?: string }[]; followUps: string[]; primary?: boolean }[];
};

/** The persona's sections and questions in the template format (round-trips through the parser). */
export function renderPersonaMarkdown(doc: DocLike, title = "Persona"): string {
  const out: string[] = [`# ${title}`, ""];
  for (const s of doc.sections) {
    out.push(`## ${renderLText(s.title)} (${s.display}) [${s.visibility}] {${s.key}}`);
    const vis = (it: MdItem) => (it.visibility && it.visibility !== s.visibility ? `[${it.visibility}] ` : "");
    for (const it of s.items) {
      switch (s.display) {
        case "facts":
          out.push(`- ${renderLText(it.label) || it.id}: ${vis(it)}${renderLText(it.value ?? it.text)}`);
          break;
        case "paragraphs":
          if (renderLText(it.text ?? it.value).trim()) out.push(`${vis(it)}${renderLText(it.text ?? it.value, "block")}`, "");
          break;
        case "timeline":
          out.push(`- ${vis(it)}${[it.period || "?", renderLText(it.label), renderLText(it.meta), ...(it.details ?? []).map((d) => renderLText(d))].join(" | ").replace(/( \| )+$/, "")}`);
          break;
        case "tags":
          out.push(`- ${vis(it)}${it.label ? `${renderLText(it.label)}: ` : ""}${(it.tags ?? []).join(", ")}`);
          break;
        case "gallery":
          out.push(`- ${vis(it)}${it.src ?? ""}${it.label ? ` | ${renderLText(it.label)}` : ""}`);
          break;
        case "quotes":
          out.push(`- ${vis(it)}${[renderLText(it.text ?? it.value), renderLText(it.label), renderLText(it.meta)].join(" | ").replace(/( \| )+$/, "")}`);
          break;
        default:
          out.push(`- ${vis(it)}${renderLText(it.text ?? it.value)}`);
      }
    }
    out.push("");
  }
  if (doc.questions.length) {
    out.push("## Questions", "");
    for (const q of doc.questions) {
      out.push(`### ${renderLText(q.label)} {${q.id}}`);
      out.push(`Prompt: ${renderLText(q.prompt)}`);
      if (q.keywords.length) out.push(`Keywords: ${q.keywords.join(", ")}`);
      for (const a of q.answers) out.push(`Answer: ${renderLText(a, "block").replace(/\n/g, "\n  ")}`);
      const shows = q.blocks.filter((b) => b.kind === "section" && b.key).map((b) => b.key);
      if (shows.length) out.push(`Shows: ${shows.join(", ")}`);
      if (q.followUps.length) out.push(`Follow-ups: ${q.followUps.join(", ")}`);
      if (q.primary) out.push("Primary: yes");
      out.push("");
    }
  }
  return `${out.join("\n").trim()}\n`;
}

export const SECTION_DISPLAYS_LIST = DISPLAYS;
export const VISIBILITIES = VIS;
