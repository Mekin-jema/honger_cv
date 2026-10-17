import "server-only";
import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { authOptions, authSecret, staticOtp } from "./auth-options.mjs";
import { getPool } from "./db";
import { overLimit, recordHit } from "./http";
import { mailWarning, sendLoginCode } from "./mail";

/**
 * The admin login (Better Auth): email + password, then a 6-digit code. One account only. The
 * per-address limits come from Better Auth (behind a trusted proxy); these hooks add a per-email limit
 * (the same for unknown and real addresses, so it reveals nothing) and a global one.
 */

const HOUR = 60 * 60_000;
const PER_EMAIL = 10;
const GLOBAL = 30;
const emailKey = (email: unknown) =>
  `admin:login:${createHash("sha256").update(String(email ?? "").trim().toLowerCase()).digest("base64url").slice(0, 32)}`;

/** Origins of the persona hosts (PERSONA_HOSTS), so a login form served there passes the origin check. */
function personaOrigins(): string[] {
  const hosts = (process.env.PERSONA_HOSTS ?? "")
    .split(";")
    .flatMap((part) => (part.split("=")[1] ?? "").split(","))
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.flatMap((h) => (h.startsWith("localhost") || h.startsWith("127.") ? [`http://${h}`] : [`https://${h}`]));
}

function create() {
  return betterAuth(
    authOptions({
      pool: getPool(),
      sendOTP: ({ user, otp }) => sendLoginCode(user.email, otp),
      trustedOrigins: personaOrigins(),
      hooks: {
        before: createAuthMiddleware(async (ctx) => {
          if (ctx.path !== "/sign-in/email") return;
          if (overLimit(emailKey(ctx.body?.email), PER_EMAIL, HOUR) || overLimit("admin:global", GLOBAL, HOUR))
            throw new APIError("TOO_MANY_REQUESTS", { message: "Too many sign-in attempts. Try again later." });
        }),
        after: createAuthMiddleware(async (ctx) => {
          if (ctx.path !== "/sign-in/email") return;
          if (ctx.context.returned instanceof APIError) {
            recordHit(emailKey(ctx.body?.email), HOUR);
            recordHit("admin:global", HOUR);
          }
        }),
      },
      // Lets server code that signs in (none today) set cookies; must stay the last plugin.
      plugins: [nextCookies()],
    }),
  );
}

type Auth = ReturnType<typeof create>;
const g = globalThis as typeof globalThis & { __auth?: Auth };

/** The Better Auth instance (created on first use, so the site runs without a database). */
export function getAuth(): Auth {
  return (g.__auth ??= create());
}

/** Startup warnings about the admin login (src/instrumentation.ts). */
export function authWarnings(): string[] {
  const out: string[] = [];
  if (!authSecret()) out.push("[auth] BETTER_AUTH_SECRET is missing or shorter than 32 characters: admin sign-in is disabled.");
  if (staticOtp())
    out.push(
      [
        "[auth] ===========================================================================",
        "[auth]  ADMIN_OTP_STATIC is set: every admin sign-in accepts the same fixed code.",
        "[auth]  Anyone who has the password can sign in. Set MAIL_PROVIDER to send real codes",
        "[auth]  and remove ADMIN_OTP_STATIC.",
        "[auth] ===========================================================================",
      ].join("\n"),
    );
  const mail = mailWarning(!!staticOtp());
  if (mail) out.push(mail);
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_URL) out.push("[auth] BETTER_AUTH_URL is not set: set it to the site's public https:// address.");
  return out;
}
