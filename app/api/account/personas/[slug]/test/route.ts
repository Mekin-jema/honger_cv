import { PersonaDocSchema, formatIssues } from "@/lib/persona/schema";
import { lt } from "@/lib/persona/text";
import { customerSession } from "@/server/admin-session";
import { hasTrainingContent } from "@/lib/persona/training";
import { answerQuestion, type AiTurn } from "@/server/brain/answer";
import { aiEnabled } from "@/server/brain/model";
import { bad, forbidden, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";
import { clientView, compilePersona } from "@/server/persona/compile";
import { recordPlatformEventSafely } from "@/server/platform-events";

type Context = { params: Promise<{ slug: string }> };
const SLUG = /^[a-z][a-z0-9-]{1,31}$/;

export async function POST(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to test your assistant.", 401);
  if (!aiEnabled()) return bad("AI testing is not available right now.", 503);

  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);
  if (limited(`customer-ai-test:${session.userId}:${slug}`, 20, 10 * 60_000)) {
    return bad("Too many test questions. Try again in a few minutes.", 429);
  }

  const body = await readJson(req, 8_000);
  const question = str(body?.question, 300);
  if (!question || question.length < 2) return bad("Enter a question to test.");
  const history: AiTurn[] = [];
  if (Array.isArray(body?.history)) {
    for (const turn of body.history.slice(-6)) {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) continue;
      const record = turn as Record<string, unknown>;
      const q = str(record.q, 300);
      const a = str(record.a, 600);
      if (q && a) history.push({ q, a });
    }
  }
  const draft = await loadDraft(slug);
  if (!draft) return bad("This profile has no training draft.", 404);
  const parsed = PersonaDocSchema.safeParse(draft.doc);
  if (!parsed.success) return bad(`Fix the draft before testing: ${formatIssues(parsed.error, 6).join("; ")}`, 422);
  if (!hasTrainingContent(parsed.data)) return bad("Add your own details in the Knowledge tab before asking your AI.", 409);

  try {
    const compiled = compilePersona(slug, parsed.data, { versionId: null, number: 0 });
    const answer = await answerQuestion({ compiled, tier: "public", question, history });
    const result = answer.result;
    const view = clientView(compiled, "public", parsed.data.site.defaultLang);
    await recordPlatformEventSafely(session.userId, "assistant_tested", slug, { route: answer.result.route });
    if (result.route === "topic") {
      const topic = view.questions.find((item) => item.id === result.intentId);
      const savedAnswer = parsed.data.questions.find((item) => item.id === result.intentId)?.answers[0];
      return json({
        ok: true,
        route: "topic",
        intentId: result.intentId,
        answerId: `draft-${draft.rev}`,
        text: result.text || (savedAnswer ? lt(savedAnswer, parsed.data.site.defaultLang) : null),
        cards: topic?.blocks ?? [],
        suggestedTopics: topic?.followUps ?? [],
      });
    }
    if (result.route === "answer") {
      return json({ ok: true, route: "answer", answerId: `draft-${draft.rev}`, text: result.text, cards: result.cards, suggestedTopics: result.suggestedTopics });
    }
    if (result.route === "gated") {
      return json({
        ok: true,
        route: "answer",
        answerId: `draft-${draft.rev}`,
        text: "That detail is not included in the public information in your profile yet.",
        cards: [],
        suggestedTopics: view.defaultFollowUps,
      });
    }
    return json({ ok: true, route: "decline" });
  } catch (error) {
    console.error(`[account-ai-test] ${slug}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
    return bad("The assistant couldn't answer this test question. Try again shortly.", 502);
  }
}
