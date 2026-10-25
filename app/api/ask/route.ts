import { looksLikeAccessCode } from "@/lib/persona/access-code";
import { answerQuestion, type AiTurn } from "@/server/brain/answer";
import { aiEnabled } from "@/server/brain/model";
import {
  bad,
  clientKey,
  consentedVisitor,
  forbidden,
  json,
  limited,
  newId,
  overLimit,
  readJson,
  recordHit,
  sameOrigin,
  str,
} from "@/server/http";
import { clientView } from "@/server/persona/compile";
import { personaForRequest } from "@/server/persona/resolve";
import { addAiAnswer, type AiAnswerEntry } from "@/server/store";
import { customerPersonaHasPortfolioPro } from "@/server/billing";

// 20 free-form questions per 10 minutes per client and persona, and AI_DAILY_LIMIT answered questions per
// day across everyone (the cost cap; failed calls don't count).
const PER_CLIENT = { max: 20, windowMs: 10 * 60_000 };
const DAY_MS = 24 * 60 * 60_000;
const DAILY_KEY = "ai:daily";
const dailyLimit = () => {
  const n = Number(process.env.AI_DAILY_LIMIT ?? 500);
  return Number.isInteger(n) && n > 0 ? n : 500;
};
const MAX_TURNS = 6;

/** The last few turns the browser sends along, trimmed to what the model needs. */
function parseHistory(value: unknown): AiTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: AiTurn[] = [];
  for (const t of value.slice(-MAX_TURNS)) {
    const rec = (t && typeof t === "object" ? t : {}) as Record<
      string,
      unknown
    >;
    const q = str(rec.q, 300);
    const a = str(rec.a, 600);
    if (q && a) turns.push({ q, a });
  }
  return turns;
}

/** Keeps what was asked and answered (the admin's review list), without ever failing the request. */
const remember = (
  entry: Omit<AiAnswerEntry, "createdAt" | "reviewedAt" | "promotedTo">,
) =>
  addAiAnswer(entry).catch((err) =>
    console.error("[ask] Could not save:", err),
  );
const skip = async () => {};

/**
 * A question none of the written answers matched. Answers with a topic to play, a short AI answer (with
 * cards and follow-ups), "that's shared privately" (gated) or a decline; the browser shows its usual
 * fallback for anything else.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (!aiEnabled()) return bad("AI answers are switched off.", 503);
  const persona = await personaForRequest(req);
  const { compiled, tier, lang, preview } = persona;
  if (!preview) {
    if (!(await customerPersonaHasPortfolioPro(compiled.slug))) {
      return bad("Advanced visitor AI is part of Portfolio Pro. Curated CV topics remain available.", 402);
    }
  }
  if (
    limited(
      `ask:${compiled.slug}:${clientKey(req)}`,
      PER_CLIENT.max,
      PER_CLIENT.windowMs,
    )
  )
    return bad(
      "Too many questions at once - please try again in a few minutes.",
      429,
    );
  if (overLimit(DAILY_KEY, dailyLimit(), DAY_MS))
    return bad(
      "The AI has answered enough for today - please pick a listed question.",
      429,
    );
  const body = await readJson(req, 12_000);
  if (!body) return bad("Invalid request.");
  const question = str(body.question, 300);
  if (!question || question.length < 2) return bad("Ask a question first.");
  // An access code belongs in the code box (POST /api/access/unlock), never in a model prompt or the logs.
  if (looksLikeAccessCode(question))
    return json({ ok: true, route: "decline" });
  const history = parseHistory(body.history);
  // Device details only with consent; otherwise just the anonymous visitor id (or nothing).
  const visitor = consentedVisitor(body, req) ?? undefined;
  const who = {
    persona: compiled.slug,
    versionId: compiled.versionId ?? undefined,
    tier,
    visitor,
    question,
  };

  const id = newId();
  const started = Date.now();
  // Questions asked while the admin previews a draft are answered from the draft and not logged.
  const log = preview ? skip : remember;
  let outcome: Awaited<ReturnType<typeof answerQuestion>>;
  try {
    outcome = await answerQuestion({ compiled, tier, question, history });
  } catch (err) {
    console.error(
      "[ask] AI call failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : err,
    );
    await log({ id, ...who, lang, route: "error", ms: Date.now() - started });
    return bad(
      "Couldn't reach the AI right now - please try a listed question.",
      502,
    );
  }
  recordHit(DAILY_KEY, DAY_MS);

  const { result, meta } = outcome;
  await log({
    id,
    ...who,
    lang: meta.lang ?? lang,
    route: result.route,
    intentId: result.route === "topic" ? result.intentId : undefined,
    answer:
      result.route === "answer" || result.route === "topic"
        ? result.text
        : undefined,
    cards:
      result.route === "answer"
        ? result.cards.map((c) =>
            c.kind === "project"
              ? `project:${c.id}`
              : c.kind === "section"
                ? `section:${c.key}`
                : c.kind,
          )
        : undefined,
    model: meta.model,
    ms: meta.ms,
    declineReason: meta.declineReason,
    confidence:
      meta.coverage === "full" ? "high" : meta.coverage ? "low" : undefined,
    retrieved: meta.retrieved,
    flags: Object.keys(meta.flags).length ? meta.flags : undefined,
    usage: meta.usage,
  });

  // The visitor's own view of the persona: cards and follow-ups they may see, in their language.
  const view = clientView(
    compiled,
    tier,
    meta.lang && compiled.doc.site.languages.includes(meta.lang)
      ? meta.lang
      : lang,
  );
  if (result.route === "topic") {
    // The topic's own cards and follow-ups, led by the model's tailored text when the question was specific.
    const topic = view.questions.find((q) => q.id === result.intentId);
    return json({
      ok: true,
      route: "topic",
      intentId: result.intentId,
      answerId: id,
      text: result.text ?? null,
      cards: topic?.blocks ?? [],
      suggestedTopics: topic?.followUps ?? [],
    });
  }
  if (result.route === "answer")
    return json({
      ok: true,
      route: "answer",
      answerId: id,
      text: result.text,
      cards: result.cards,
      suggestedTopics: result.suggestedTopics,
    });
  if (result.route === "gated")
    return json({
      ok: true,
      route: "gated",
      answerId: id,
      text: view.labels.gatedText,
      cards: [{ kind: "request-access" }],
      suggestedTopics: view.defaultFollowUps,
    });
  return json({ ok: true, route: "decline" });
}
