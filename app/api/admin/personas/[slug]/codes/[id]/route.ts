import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { revokeCode } from "@/server/access/codes";
import { bad, json } from "@/server/http";

type Ctx = { params: Promise<{ slug: string; id: string }> };

/** DELETE: revokes the code; visitors who unlocked with it lose access within a minute. */
export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug, id } = await ctx.params;
  if (!SLUG_RE.test(slug) || !/^[0-9a-f-]{36}$/i.test(id)) return bad("No such code.", 404);
  return (await revokeCode(slug, id)) ? json({ ok: true }) : bad("No such code, or it was already revoked.", 404);
}
