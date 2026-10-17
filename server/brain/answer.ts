import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import type { Block, Lang, Tier } from "@/lib/persona/types";
import type { CompiledPersona } from "../persona/compile";
import { compileBrain, type BrainTier } from "./compile";
import { findLeak } from "./leak";
import { chatModelId, fallbackModelId, google } from "./model";
import { retrieve } from "./retrieval";

/**
 * A free-form question, answered by Gemini from the persona's knowledge and nothing else. The written
 * answers stay the first choice: the browser only asks when nothing it has fits. The model must reply
 * with structured JSON (route to a ready-made topic, write a short grounded answer, say the details are
 * shared privately, or decline); the server then checks every id and card against what this visitor may
 * see, and runs the leak filter, before anything reaches the browser.
 */

const TIMEOUT_MS = 15_000;
/** When the first model hasn't answered by then, the fallback is asked too and the first answer wins. */
const HEDGE_MS = 5_000;
const MAX_ANSWER_CHARS = 1_200;

export type AiTurn = { q: string; a: string };

export type AiResult =
  /** `text` when the question was more specific than the topic's written answer. */
  | { route: "topic"; intentId: string; text?: string }
  | { route: "answer"; text: string; cards: Block[]; suggestedTopics: string[] }
  /** The answer needs details shared only with visitors who have an access code. */
  | { route: "gated"; gatedSection?: string }
  | { route: "decline" };

export type AnswerMeta = {
  model: string;
  ms: number;
  lang?: Lang;
  coverage?: "full" | "partial" | "none";
  declineReason?: "off-topic" | "missing-fact" | "unsafe";
  retrieved?: string[];
  flags: { leak?: boolean; hedged?: boolean; gatedSection?: string };
  usage?: { input?: number; output?: number; cached?: number };
};

// Kept Gemini-friendly: enums, strings and arrays; defaults are applied after parsing.
const AnswerSchema = z.object({
  route: z.enum(["topic", "answer", "gated", "decline"]),
  intentId: z.string().optional(),
  answer: z.string().optional(),
  cards: z.array(z.string()).optional(),
  suggestedTopics: z.array(z.string()).optional(),
  gatedSection: z.string().optional(),
  coverage: z.enum(["full", "partial", "none"]).optional(),
  declineReason: z.enum(["off-topic", "unsafe"]).optional(),
  lang: z.enum(["en", "bn"]).optional(),
});
type Raw = z.infer<typeof AnswerSchema>;

/** Card ids from the model -> cards this visitor may see (max 3, no duplicates). */
function parseCards(value: string[] | undefined, tier: BrainTier): Block[] {
  const out: Block[] = [];
  for (const item of [...new Set(value ?? [])]) {
    if (!tier.cards.has(item)) continue;
    if (item.startsWith("section:")) out.push({ kind: "section", key: item.slice(8) });
    else if (item.startsWith("project:")) out.push({ kind: "project", id: item.slice(8) });
    else out.push({ kind: item } as Block);
    if (out.length === 3) break;
  }
  return out;
}

/** Only **bold** survives: links become their text, headings and code marks go. */
const plainAnswer = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/`+/g, "")
    .trim()
    .slice(0, MAX_ANSWER_CHARS);

function toResult(raw: Raw, tier: BrainTier, defaults: string[]): AiResult {
  const answer = raw.answer?.trim() ? plainAnswer(raw.answer) : undefined;
  if (raw.route === "topic" && raw.intentId && tier.topicIds.has(raw.intentId)) return { route: "topic", intentId: raw.intentId, text: answer };
  if (raw.route === "gated" && tier.tier === "public" && tier.gatedTitles.length) {
    const title = tier.gatedTitles.find((t) => t.toLowerCase() === raw.gatedSection?.trim().toLowerCase());
    return { route: "gated", gatedSection: title };
  }
  if (raw.route === "answer" && answer) {
    const topics = [...new Set((raw.suggestedTopics ?? []).filter((t) => tier.topicIds.has(t)))].slice(0, 3);
    return { route: "answer", text: answer, cards: parseCards(raw.cards, tier), suggestedTopics: topics.length ? topics : defaults.filter((t) => tier.topicIds.has(t)) };
  }
  return { route: "decline" };
}

const retryable = (err: unknown) => !(APICallError.isInstance(err) && (err.statusCode === 401 || err.statusCode === 403));

/**
 * Asks the model about `question` for persona `compiled` and a visitor at `tier`. Throws when the model
 * can't be reached or returns something unusable; the route then shows the usual fallback.
 */
export async function answerQuestion(input: { compiled: CompiledPersona; tier: Tier; question: string; history: AiTurn[] }): Promise<{ result: AiResult; meta: AnswerMeta }> {
  const { compiled, tier, question, history } = input;
  const brain = compileBrain(compiled);
  const bt = tier === "unlocked" ? brain.unlocked : brain.public;
  const started = Date.now();

  // Big personas: the knowledge in the prompt is replaced by the most relevant items (the prefix stays stable).
  let notes = "";
  let retrieved: string[] | undefined;
  if (brain.retrieval && compiled.versionId) {
    const hits = await retrieve(compiled.versionId, question, tier).catch(() => []);
    retrieved = hits.map((h) => h.itemKey);
    notes = hits.map((h) => `- ${h.content}`).join("\n");
  }

  const messages = [
    ...history.flatMap((t) => [
      { role: "user" as const, content: t.q },
      { role: "assistant" as const, content: JSON.stringify({ route: "answer", answer: t.a }) },
    ]),
    { role: "user" as const, content: notes ? `RELEVANT NOTES:\n${notes}\n\nQUESTION: ${question}` : question },
  ];
  // The date goes after the stable prefix, so the prefix can be served from Gemini's cache.
  const system = `${bt.prompt}\n\nToday is ${new Date().toISOString().slice(0, 10)}.`;

  const call = async (modelId: string, signal: AbortSignal, thinkingOff: boolean) =>
    generateText({
      model: google()(modelId),
      system,
      messages,
      output: Output.object({ schema: AnswerSchema }),
      temperature: 0.2,
      maxOutputTokens: 700,
      maxRetries: 0,
      abortSignal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
      // Short factual answers don't need a reasoning pass; skipping it saves most of the latency and cost.
      providerOptions: thinkingOff ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined,
    });
  const run = async (modelId: string, signal: AbortSignal) => {
    try {
      return { res: await call(modelId, signal, true), model: modelId };
    } catch (err) {
      // Some models reject thinkingBudget; ask once more without it.
      if (APICallError.isInstance(err) && err.statusCode === 400) return { res: await call(modelId, signal, false), model: modelId };
      throw err;
    }
  };

  const primary = chatModelId();
  const fallback = fallbackModelId();
  let hedged = false;
  let outcome: Awaited<ReturnType<typeof run>>;
  try {
    const c1 = new AbortController();
    const p1 = run(primary, c1.signal);
    p1.catch(() => {}); // may lose the race below; its failure is reported through Promise.any instead
    if (!fallback || fallback === primary) outcome = await p1;
    else {
      // Hedge: the first model gets HEDGE_MS. If it is slow, busy or gone, the fallback is asked as well and
      // whichever answers first wins (Gemini's tail latency is spiky; this keeps the visitor's wait short).
      let timer: ReturnType<typeof setTimeout> | undefined;
      const first = await Promise.race([p1.then((v) => ({ v }), (err: unknown) => ({ err })), new Promise<{ hedge: true }>((r) => (timer = setTimeout(() => r({ hedge: true }), HEDGE_MS)))]);
      clearTimeout(timer);
      if ("v" in first) outcome = first.v;
      else {
        if ("err" in first && !retryable(first.err)) throw first.err;
        hedged = true;
        const c2 = new AbortController();
        const p2 = run(fallback, c2.signal);
        p2.catch(() => {});
        try {
          outcome = await Promise.any([p1, p2]);
        } catch (err) {
          throw err instanceof AggregateError ? (err.errors[0] ?? err) : err;
        }
        (outcome.model === primary ? c2 : c1).abort();
      }
    }
  } catch (err) {
    // A safety block comes back as "no object": that is a decline, not a failure.
    if (NoObjectGeneratedError.isInstance(err) && err.finishReason === "content-filter")
      return { result: { route: "decline" }, meta: { model: primary, ms: Date.now() - started, declineReason: "unsafe", flags: {} } };
    throw err;
  }

  const raw = outcome.res.output as Raw;
  let result = toResult(raw, bt, brain.defaultTopics);
  const flags: AnswerMeta["flags"] = {};
  if (hedged) flags.hedged = true;

  // Leak filter: never let a value above the visitor's tier through, whatever the model wrote.
  const text = result.route === "answer" || result.route === "topic" ? result.text : undefined;
  if (text && findLeak(text, bt.leakTerms)) {
    flags.leak = true;
    result = tier === "public" && bt.gatedTitles.length ? { route: "gated" } : { route: "decline" };
  }
  if (result.route === "gated" && result.gatedSection) flags.gatedSection = result.gatedSection;

  const usage = outcome.res.usage;
  return {
    result,
    meta: {
      model: outcome.model,
      ms: Date.now() - started,
      lang: raw.lang,
      coverage: raw.coverage,
      declineReason: result.route === "decline" ? (raw.declineReason ?? (raw.coverage === "none" ? "missing-fact" : undefined)) : raw.coverage === "none" ? "missing-fact" : undefined,
      retrieved,
      flags,
      usage: { input: usage?.inputTokens, output: usage?.outputTokens, cached: usage?.inputTokenDetails?.cacheReadTokens },
    },
  };
}
