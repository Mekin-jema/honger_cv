import { looksLikeAccessCode } from "@/lib/persona/access-code";
import { redeemCode } from "@/server/access/codes";
import { UNLOCK_DAYS, unlockCookieName, unlockToken } from "@/server/access/cookie";
import { bad, clientKey, cookieHeader, forbidden, json, overLimit, readJson, recordHit, sameOrigin, str } from "@/server/http";
import { personaForRequest } from "@/server/persona/resolve";

// Wrong codes: 5 per 15 minutes per visitor, 60 an hour for everyone together (per persona). A code has
// 100 random bits, so this is about noise and cost, not guessing.
const PER_CLIENT = { max: 5, windowMs: 15 * 60_000 };
const PER_PERSONA = { max: 60, windowMs: 60 * 60_000 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST { code }: a valid access code unlocks this persona's "with access code" details in this browser
 * for a week (a signed cookie; revoking the code or "sign everyone out" ends it). DELETE locks again.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const { compiled, slug, accessEpoch, preview } = await personaForRequest(req);
  if (compiled.doc.access.mode === "open") return bad("There is nothing to unlock here.", 404);
  if (preview) return bad("Exit the draft preview to try a code.", 409);
  const mine = `unlock:${slug}:${clientKey(req)}`;
  const all = `unlock:${slug}`;
  if (overLimit(mine, PER_CLIENT.max, PER_CLIENT.windowMs) || overLimit(all, PER_PERSONA.max, PER_PERSONA.windowMs)) return bad("Too many tries - please wait a few minutes.", 429);
  const body = await readJson(req, 4_000);
  const code = str(body?.code, 64) ?? "";
  const visitorId = str((body?.visitor as Record<string, unknown> | undefined)?.visitorId, 64);
  const result = looksLikeAccessCode(code) ? await redeemCode(slug, code, visitorId) : ({ ok: false } as const);
  if (!result.ok) {
    recordHit(mine, PER_CLIENT.windowMs);
    recordHit(all, PER_PERSONA.windowMs);
    await sleep(400);
    return bad("That code didn't work.", 401);
  }
  const token = unlockToken(slug, result.codeId, accessEpoch);
  if (!token) return bad("Unlocking isn't set up on this server (PERSONA_SIGNING_SECRET).", 503);
  // Lax: a code link opened from a messaging app is a cross-site navigation, and must still work.
  return json({ ok: true }, 200, { "set-cookie": cookieHeader(unlockCookieName(slug), token, { maxAge: UNLOCK_DAYS * 86_400, sameSite: "Lax" }) });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const { slug } = await personaForRequest(req);
  return json({ ok: true }, 200, { "set-cookie": cookieHeader(unlockCookieName(slug), "", { maxAge: 0, sameSite: "Lax" }) });
}
