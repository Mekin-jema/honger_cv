// The admin login's Better Auth configuration, shared by the app (src/server/auth.ts), the schema
// generator (scripts/auth-schema.mjs) and the account script (scripts/admin-create.mjs). Plain
// JavaScript so the scripts run with plain Node. Exactly one account (the owner) can ever exist.
//
// Sign-in is email + password, then a 6-digit code (the two-factor plugin's OTP mode). While
// ADMIN_OTP_STATIC is set (e.g. 112233), the code a sign-in expects is that fixed value instead of a
// random one, and nothing is emailed; the page still says "check your email". Remove the variable and
// set MAIL_PROVIDER to send real codes.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { twoFactor } from "better-auth/plugins/two-factor";

/** The fixed sign-in code, when one is configured (4 to 10 digits). */
export function staticOtp() {
  const code = process.env.ADMIN_OTP_STATIC?.trim();
  return code && /^\d{4,10}$/.test(code) ? code : undefined;
}

const g = /** @type {typeof globalThis & { __authDevSecret?: string }} */ (globalThis);

/** BETTER_AUTH_SECRET; in development a random per-process one (sessions then end with the process). */
export function authSecret() {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") return undefined;
  return (g.__authDevSecret ??= randomBytes(32).toString("base64url"));
}

/** The public origin of the admin (where /admin and /api/auth live). */
export function authBaseUrl() {
  return (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || undefined;
}

// AES-256-GCM for the stored fixed code (the store format is "<value>:<attempts>", so no ":" allowed).
const sealKey = () => createHash("sha256").update(`admin-otp:${authSecret() ?? ""}`).digest();
function seal(text) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", sealKey(), iv);
  const data = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}
function open(value) {
  try {
    const raw = Buffer.from(value, "base64url");
    const d = createDecipheriv("aes-256-gcm", sealKey(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/**
 * How codes are stored. Normally hashed. With a fixed code, the store keeps the fixed code (sealed)
 * in place of the random one Better Auth generated, so only the fixed code verifies; it still expires,
 * is single-use and counts failed attempts like any other code.
 */
function storeOTP() {
  const code = staticOtp();
  if (!code) return /** @type {const} */ ("hashed");
  return { encrypt: async () => seal(code), decrypt: async (value) => open(value) };
}

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   sendOTP?: (data: { user: { email: string }, otp: string }) => Promise<void> | void,
 *   allowSignUp?: boolean,
 *   hooks?: import("better-auth").BetterAuthOptions["hooks"],
 *   plugins?: import("better-auth").BetterAuthPlugin[],
 *   trustedOrigins?: string[],
 * }} options
 * @returns {import("better-auth").BetterAuthOptions}
 */
export function authOptions({ pool, sendOTP, allowSignUp = false, hooks, plugins = [], trustedOrigins = [] }) {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  const behindProxy = Number.isInteger(hops) && hops > 0;
  return {
    appName: "Portfolio admin",
    baseURL: authBaseUrl(),
    basePath: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`,
    secret: authSecret(),
    database: pool,
    trustedOrigins: [authBaseUrl(), ...trustedOrigins].filter((o) => !!o),
    emailAndPassword: { enabled: true, disableSignUp: !allowSignUp, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: false },
    user: { modelName: "admin_users" },
    account: { modelName: "admin_accounts" },
    verification: { modelName: "admin_verifications" },
    session: {
      modelName: "admin_sessions",
      // 12 hours, extended (at most hourly) while in use. No cookie cache: a revoked session dies at once.
      expiresIn: 12 * 3600,
      updateAge: 3600,
      freshAge: 3600,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "admin_rate_limits",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 900, max: 5 },
        "/two-factor/send-otp": { window: 120, max: 2 },
        "/two-factor/verify-otp": { window: 900, max: 10 },
        "/change-password": { window: 900, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "fb",
      defaultCookieAttributes: { sameSite: "strict", httpOnly: true, path: "/" },
      // Only trust a client address set by our own proxy (TRUST_PROXY_HOPS); otherwise a visitor could
      // send any X-Forwarded-For and dodge the per-address limits. Without one, the per-email and
      // global limits (src/server/auth.ts) still apply.
      ipAddress: behindProxy ? { ipAddressHeaders: ["x-real-ip"] } : { disableIpTracking: true },
    },
    databaseHooks: {
      user: {
        create: {
          // Exactly one account, ever: a second sign-up is refused even if sign-up were switched on.
          before: async (user) => {
            const { rows } = await pool.query('SELECT 1 FROM admin_users LIMIT 1').catch(() => ({ rows: [] }));
            return rows.length ? false : { data: user };
          },
        },
      },
    },
    hooks,
    plugins: [
      twoFactor({
        issuer: "Portfolio admin",
        skipVerificationOnEnable: true,
        schema: { twoFactor: { modelName: "admin_two_factor" } },
        otpOptions: {
          digits: 6,
          period: 5,
          allowedAttempts: 5,
          storeOTP: storeOTP(),
          sendOTP: async ({ user, otp }) => {
            if (staticOtp()) return; // nothing to deliver: the fixed code is the code
            await sendOTP?.({ user, otp });
          },
        },
      }),
      ...plugins,
    ],
  };
}
