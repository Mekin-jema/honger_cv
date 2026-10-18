import { PersonaDocSchema, formatIssues } from "@/lib/persona/schema";
import { customerSession } from "@/server/admin-session";
import { answerQuestion } from "@/server/brain/answer";
import { aiEnabled } from "@/server/brain/model";
import { bad, forbidden, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";
import { compilePersona } from "@/server/persona/compile";
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

  const body = await readJson(req, 4_000);
  const question = str(body?.question, 300);
  if (!question || question.length < 2) return bad("Enter a question to test.");
  const draft = await loadDraft(slug);
  if (!draft) return bad("This profile has no training draft.", 404);
  const parsed = PersonaDocSchema.safeParse(draft.doc);
  if (!parsed.success) return bad(`Fix the draft before testing: ${formatIssues(parsed.error, 6).join("; ")}`, 422);

  try {
    const compiled = compilePersona(slug, parsed.data, { versionId: null, number: 0 });
    const answer = await answerQuestion({ compiled, tier: "public", question, history: [] });
    await recordPlatformEventSafely(session.userId, "assistant_tested", slug, { route: answer.result.route });
    return json({ ok: true, result: answer.result });
  } catch (error) {
    console.error(`[account-ai-test] ${slug}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
    return bad("The assistant couldn't answer this test question. Try again shortly.", 502);
  }
}
