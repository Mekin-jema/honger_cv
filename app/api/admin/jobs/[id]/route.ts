import { adminGuard, isResponse } from "@/server/admin-api";
import { bad, json } from "@/server/http";
import { getJob } from "@/server/jobs";

/** A background job's progress (publish & train, PDF, checks), polled by the admin. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const job = await getJob(id);
  return job ? json({ ok: true, job }) : bad("No such job.", 404);
}
