import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { resetAccess } from "@/server/access/codes";
import { bad, json } from "@/server/http";
import { personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** POST: every visitor who unlocked this persona has to enter a code again. */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  return json({ ok: true, epoch: await resetAccess(slug) });
}
