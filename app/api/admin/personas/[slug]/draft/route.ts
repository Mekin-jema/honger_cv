import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson } from "@/server/http";
import { saveDraft } from "@/server/persona/repo";
import { draftReport, editableDraft, personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * GET: the draft (or, before the first save, the live version, or for the job persona the code content).
 * PUT { doc, rev }: saves the draft if nobody saved since `rev` (409 otherwise). Drafts may be unfinished:
 * problems are returned as `issues` and only block publishing. `changed` says whether it differs from
 * the live version.
 */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const state = await editableDraft(slug);
  if (!state) return bad("This persona has no draft yet.", 404);
  return json({ ok: true, ...state });
}

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = await readJson(req, 2_000_000);
  if (!body || typeof body.doc !== "object" || body.doc === null || Array.isArray(body.doc)) return bad("Send { doc, rev }.");
  const rev = typeof body.rev === "number" && Number.isInteger(body.rev) && body.rev >= 0 ? body.rev : -1;
  if (rev < 0) return bad("Missing the revision the edit started from.");
  const next = await saveDraft(slug, body.doc, rev);
  if (next === null) return bad("Changed elsewhere since you opened it. Reload to see the latest draft.", 409);
  return json({ ok: true, rev: next, ...(await draftReport(slug, body.doc)) });
}
