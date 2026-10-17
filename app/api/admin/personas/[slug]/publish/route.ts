import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson } from "@/server/http";
import { PublishError, startPublish } from "@/server/persona/publish";

type Ctx = { params: Promise<{ slug: string }> };

// Publishing runs after the response (embeddings and checks can take a minute or two).
export const maxDuration = 300;

/** POST { force? }: starts "Publish & train" for the draft; poll GET /api/admin/jobs/<id>/ for progress. */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) return bad("No such persona.", 404);
  const body = (await readJson(req, 1_000)) ?? {};
  try {
    // The server prints the document PDF from its own pages: PORT on this machine, else this request's origin.
    const selfOrigin = process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : new URL(req.url).origin;
    const r = await startPublish(slug, { force: body.force === true, selfOrigin });
    if (r.unchanged) return json({ ok: true, unchanged: true });
    return json({ ok: true, jobId: r.job!.id, existing: !!r.existing }, 202);
  } catch (err) {
    if (err instanceof PublishError) return json({ ok: false, error: err.message, issues: err.issues }, 422);
    throw err;
  }
}
