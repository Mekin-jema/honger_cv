import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson } from "@/server/http";
import { markReviewed, personaRow, reviewEntries } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** GET: AI answers that need a look. POST { ids, promotedTo? }: marks them reviewed. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  return json({ ok: true, entries: await reviewEntries(slug) });
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = await readJson(req, 40_000);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200) : [];
  if (!ids.length) return bad("Send { ids }.");
  const promotedTo = typeof body?.promotedTo === "string" ? body.promotedTo.slice(0, 120) : undefined;
  return json({ ok: true, updated: await markReviewed(slug, ids, promotedTo) });
}
