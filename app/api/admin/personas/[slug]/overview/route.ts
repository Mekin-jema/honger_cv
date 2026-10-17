import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json } from "@/server/http";
import { personaRow, studioOverview } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** GET: versions (with the live one), recent jobs and whether AI is on, for the Studio overview. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  return json({ ok: true, ...(await studioOverview(slug)) });
}
