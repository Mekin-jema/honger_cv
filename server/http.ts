import { randomUUID } from "node:crypto";
import type { VisitorInfo } from "./store";

export const newId = () => randomUUID();

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

export const bad = (error: string, status = 400) => json({ ok: false, error }, status);

export const forbidden = () => bad("Forbidden.", 403);

/**
 * Cookies this app sets itself (draft preview, unlocked details) are Secure whenever the site's
 * configured URL is https, the same rule Better Auth uses for the admin cookies. A plain http URL
 * (local tests) leaves them non-Secure so the browser keeps them.
 */
export const secureCookies = () => /^https:\/\//i.test(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "");

/** A Set-Cookie header value. `maxAge` 0 deletes the cookie. */
export function cookieHeader(name: string, value: string, opts: { maxAge: number; sameSite?: "Strict" | "Lax"; path?: string }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path ?? "/"}`, `Max-Age=${Math.max(0, Math.floor(opts.maxAge))}`, "HttpOnly", `SameSite=${opts.sameSite ?? "Lax"}`];
  if (secureCookies()) parts.push("Secure");
  return parts.join("; ");
}

/**
 * How many reverse proxies in front of the app may be trusted to set client-address headers.
 * 0 (the default) ignores X-Forwarded-For and X-Real-IP entirely, because a visitor can send any value.
 */
export const trustedHops = () => {
  const n = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10) : 0;
};

/** Shown once at startup (see src/instrumentation.ts) when production runs without a trusted proxy. */
export function proxyWarning(): string | null {
  if (process.env.NODE_ENV !== "production" || trustedHops()) return null;
  return "[http] TRUST_PROXY_HOPS is 0: rate limits are shared by every visitor. Behind nginx set TRUST_PROXY_HOPS=1.";
}

const originOf = (value: string | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Rejects cross-site writes (CSRF and drive-by spam). Browsers send Sec-Fetch-Site on every request;
 * only "same-origin" and "none" (typed or bookmarked) pass. Older browsers without it are checked on
 * Origin instead: it must be missing (not a browser form post from elsewhere), this request's own
 * origin, the public NEXT_PUBLIC_SITE_URL, or match the Host the request was sent to (behind a
 * trusted proxy, X-Forwarded-Host).
 */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  const o = originOf(origin);
  if (!o) return false;
  if (o === originOf(req.url) || o === originOf(process.env.NEXT_PUBLIC_SITE_URL)) return true;
  const forwarded = trustedHops() ? req.headers.get("x-forwarded-host")?.split(",")[0].trim() : undefined;
  const host = forwarded || req.headers.get("host");
  return !!host && new URL(o).host === host.toLowerCase();
}

/**
 * Best-effort client key for rate limiting only (never stored).
 * Behind a trusted proxy, X-Real-IP (set by nginx from $remote_addr) wins; otherwise the X-Forwarded-For
 * entry the outermost trusted proxy appended (index length - hops). Without a trusted proxy every
 * request shares one key, so limits are global rather than spoofable.
 */
export function clientKey(req: Request): string {
  const hops = trustedHops();
  if (!hops) return "local";
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chain.length) return "local";
  return chain[Math.max(0, chain.length - hops)].slice(0, 64);
}

/**
 * Parses a small JSON object body. Returns null for anything that isn't `application/json`,
 * is over `maxBytes` (checked on Content-Length and again while streaming), or isn't a plain object.
 */
export async function readJson(req: Request, maxBytes = 16_000): Promise<Record<string, unknown> | null> {
  // Exact MIME type: "text/plain;application/json" is a CORS-safelisted type a cross-site form can send.
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (mime !== "application/json") return null;
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!req.body) return null;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Trimmed string within a length limit; undefined when empty. */
export function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.replace(/\u0000/g, "").trim();
  return s ? s.slice(0, max) : undefined;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 200;

const asRecord = (value: unknown) => (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

/** Only the anonymous visitor id: what is stored when the visitor has not accepted the privacy banner. */
function minimalVisitor(value: unknown): VisitorInfo | null {
  const visitorId = str(asRecord(value).visitorId, 64);
  if (!visitorId || !/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) return null;
  return { visitorId };
}

/** Visitor id plus device details. Call only when the visitor gave consent. */
function visitorFrom(value: unknown, req: Request): VisitorInfo | null {
  const base = minimalVisitor(value);
  if (!base) return null;
  const v = asRecord(value);
  return {
    ...base,
    userAgent: str(req.headers.get("user-agent"), 300),
    language: str(v.language, 40),
    timezone: str(v.timezone, 60),
    referrer: str(v.referrer, 300),
    screen: str(v.screen, 20),
  };
}

/** The visitor to store for a submission: device details only when the body says consent was given. */
export const consentedVisitor = (body: Record<string, unknown>, req: Request) =>
  body.consent === true ? visitorFrom(body.visitor, req) : minimalVisitor(body.visitor);

/** visitorFrom plus the consent-only details. */
export function extendedVisitor(value: unknown, req: Request) {
  const base = visitorFrom(value, req);
  if (!base) return null;
  const v = asRecord(value);
  const num = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? x : undefined);
  return {
    ...base,
    viewport: str(v.viewport, 20),
    platform: str(v.platform, 40),
    pixelRatio: num(v.pixelRatio, 8),
    colorScheme: str(v.colorScheme, 10),
    touch: typeof v.touch === "boolean" ? v.touch : undefined,
    landing: str(v.landing, 200),
    utm: str(v.utm, 200),
    visits: num(v.visits, 100000),
  };
}

// ---------- in-memory rate limiting (per process) ----------
type Bucket = { times: number[]; windowMs: number };
const MAX_KEYS = 10_000;
// Kept on globalThis so every route bundle in this process shares one set of limits.
const g = globalThis as typeof globalThis & { __rateHits?: Map<string, Bucket> };
const hits = (g.__rateHits ??= new Map<string, Bucket>());

/** Drops keys whose newest hit is older than their window; if still too many, the oldest non-admin keys. */
function evict(now: number) {
  for (const [key, b] of hits) {
    if (!b.times.length || now - b.times[b.times.length - 1] >= b.windowMs) hits.delete(key);
  }
  if (hits.size <= MAX_KEYS) return;
  for (const key of hits.keys()) {
    if (hits.size <= MAX_KEYS * 0.9) break;
    if (!key.startsWith("admin:")) hits.delete(key);
  }
}

function recent(key: string, windowMs: number, now: number): number[] {
  return (hits.get(key)?.times ?? []).filter((t) => now - t < windowMs);
}

/** True when `key` already has `max` or more hits in `windowMs`. Does not record a hit. */
export function overLimit(key: string, max: number, windowMs: number): boolean {
  return recent(key, windowMs, Date.now()).length >= max;
}

/** Records one hit for `key`. */
export function recordHit(key: string, windowMs: number) {
  const now = Date.now();
  const times = recent(key, windowMs, now);
  times.push(now);
  hits.delete(key); // re-insert so insertion order tracks recency
  hits.set(key, { times, windowMs });
  if (hits.size > MAX_KEYS) evict(now);
}

/** Records a hit and returns true when the caller is over `max` requests in `windowMs`. */
export function limited(key: string, max: number, windowMs: number): boolean {
  recordHit(key, windowMs);
  return recent(key, windowMs, Date.now()).length > max;
}
