import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Small signed tokens for visitor cookies: unlocked details, the admin's draft preview and the PDF
 * print link. HMAC-SHA256 with a key derived per purpose from PERSONA_SIGNING_SECRET, so a token made
 * for one purpose can never be used for another. In development a random per-process key is used when
 * the secret is not set (tokens then end with the process); in production they are refused.
 */

const g = globalThis as typeof globalThis & { __personaDevKey?: Buffer };

const PLACEHOLDER = "generate-a-random-string-of-at-least-32-characters";

function secret(): Buffer | null {
  const s = process.env.PERSONA_SIGNING_SECRET?.trim();
  if (s && s.length >= 32 && s !== PLACEHOLDER) return Buffer.from(s, "utf8");
  if (process.env.NODE_ENV !== "production") return (g.__personaDevKey ??= randomBytes(32));
  return null;
}

/** Shown at startup when production can't sign visitor tokens. */
export function signingWarning(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  return secret() ? null : "[access] PERSONA_SIGNING_SECRET is missing or shorter than 32 characters: access codes, previews and PDF links won't work.";
}

const keyFor = (purpose: string) => {
  const s = secret();
  return s ? createHmac("sha256", s).update(`persona-token:${purpose}`).digest() : null;
};

const mac = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

/** "<payload>.<mac>"; null when there is no signing key. The payload must not contain secrets. */
export function signToken(purpose: string, payload: string): string | null {
  const key = keyFor(purpose);
  return key ? `${payload}.${mac(key, payload)}` : null;
}

/** The payload of a valid token, or null. Constant-time comparison. */
export function verifyToken(purpose: string, token: string | undefined): string | null {
  if (!token || token.length > 600) return null;
  const key = keyFor(purpose);
  const dot = token.lastIndexOf(".");
  if (!key || dot <= 0) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(key, payload));
  return given.length === expected.length && timingSafeEqual(given, expected) ? payload : null;
}

// ---------- unlocked details ----------

export const UNLOCK_DAYS = 7;
export const unlockCookieName = (slug: string) => `pa_${slug}`;

/** Cookie value for a visitor who entered access code `codeId` of persona `slug`. */
export function unlockToken(slug: string, codeId: string, epoch: number, now = Date.now()): string | null {
  const exp = Math.floor(now / 1000) + UNLOCK_DAYS * 86400;
  return signToken(`unlock:${slug}`, `v1.${exp}.${epoch}.${codeId}`);
}

/** The access code a valid unlock cookie was issued for (null when missing, forged, expired or reset). */
export function unlockCodeId(slug: string, value: string | undefined, epoch: number, now = Date.now()): string | null {
  const payload = verifyToken(`unlock:${slug}`, value);
  if (!payload) return null;
  const [v, exp, ep, codeId] = payload.split(".");
  if (v !== "v1" || !/^\d+$/.test(exp ?? "") || Number(exp) * 1000 <= now) return null;
  if (Number(ep) !== epoch || !codeId) return null;
  return codeId;
}

/** True when the cookie unlocks persona `slug` (and its code has not been revoked). */
export function readUnlock(slug: string, value: string | undefined, epoch: number, revoked: ReadonlySet<string> = new Set()): boolean {
  const codeId = unlockCodeId(slug, value, epoch);
  return !!codeId && !revoked.has(codeId);
}
