import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { createCode, listCodes } from "@/server/access/codes";
import { bad, json, readJson, str } from "@/server/http";
import { personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** GET: the persona's access codes (never the codes themselves). POST { label, maxUses?, days? }: a new code, shown once. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  return json({ ok: true, codes: await listCodes(slug) });
}

const positive = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max ? v : null);

export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = await readJson(req, 2_000);
  const label = str(body?.label, 80);
  if (!label) return bad("Say who the code is for (a name or family).");
  const { code, entry } = await createCode(slug, { label, maxUses: positive(body?.maxUses, 1000), days: positive(body?.days, 3650) });
  return json({ ok: true, code, entry }, 201);
}
