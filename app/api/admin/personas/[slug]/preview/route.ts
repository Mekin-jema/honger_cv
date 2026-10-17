import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, cookieHeader, json, readJson } from "@/server/http";
import { PREVIEW_COOKIE, PREVIEW_SECONDS, previewToken } from "@/server/persona/preview";
import { personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * POST { tier }: this browser shows the persona's draft on the site (as a public visitor, or with an
 * access code) for two hours, or until DELETE. The cookie only works together with the admin session.
 */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = (await readJson(req)) ?? {};
  const tier = body.tier === "unlocked" ? "unlocked" : "public";
  const token = previewToken(slug, tier);
  if (!token) return bad("Set PERSONA_SIGNING_SECRET to preview drafts.", 503);
  return json({ ok: true, slug, tier }, 200, { "set-cookie": cookieHeader(PREVIEW_COOKIE, token, { maxAge: PREVIEW_SECONDS, sameSite: "Strict" }) });
}

export async function DELETE(req: Request) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  return json({ ok: true }, 200, { "set-cookie": cookieHeader(PREVIEW_COOKIE, "", { maxAge: 0, sameSite: "Strict" }) });
}
