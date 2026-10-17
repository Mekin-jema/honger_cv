import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json } from "@/server/http";
import { PublishError } from "@/server/persona/publish";
import { personaRow, startDraftChecks } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

export const maxDuration = 300;

/** POST: asks the test questions and privacy probes against the draft, in the background (202 + jobId). */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  try {
    const { job, existing } = await startDraftChecks(slug);
    return json({ ok: true, jobId: job.id, existing }, 202);
  } catch (err) {
    if (err instanceof PublishError) return json({ ok: false, error: err.message, issues: err.issues }, 422);
    throw err;
  }
}
