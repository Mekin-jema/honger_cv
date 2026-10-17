import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson, str } from "@/server/http";
import { accessRequests, decideAccessRequest, personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** GET: access requests (new first). POST { id, action: approve | decline }: approve makes a code, shown once. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  return json({ ok: true, requests: await accessRequests(slug) });
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = await readJson(req, 1_000);
  const id = str(body?.id, 64);
  const action = body?.action === "approve" || body?.action === "decline" ? body.action : null;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !action) return bad("Send { id, action }.");
  const res = await decideAccessRequest(slug, id, action);
  return res ? json({ ok: true, ...res }) : bad("No such request.", 404);
}
