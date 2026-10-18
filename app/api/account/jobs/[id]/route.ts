import { bad, json } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { getJob } from "@/server/jobs";
import { personaOwnedBy } from "@/server/persona/repo";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await customerSession(req);
  if (!session) return bad("Sign in to view this job.", 401);
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job || job.kind !== "publish" || !(await personaOwnedBy(job.slug, session.userId))) {
    return bad("Job not found.", 404);
  }
  return json({ ok: true, job });
}
