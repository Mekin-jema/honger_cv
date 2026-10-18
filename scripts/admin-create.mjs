#!/usr/bin/env node
// The admin account (exactly one). Passwords are read hidden from the terminal (or from stdin when piped),
// never from the command line.
//
//   npm run admin:create -- --email you@example.com [--name "Your Name"]   create it (2FA on, prints backup codes once)
//   npm run admin:create -- --show                                        who it is, 2FA state, signed-in devices
//   npm run admin:create -- --reset-password                              new password; signs out everywhere
//   npm run admin:create -- --set-email new@example.com                   change the sign-in email
//   npm run admin:create -- --revoke-sessions                             sign out every device
//   npm run admin:create -- --unlock                                      clear sign-in lockouts and rate limits
//   npm run admin:create -- --reset-2fa                                   re-create the two-factor setup (new backup codes)
//
// Uses DATABASE_URL and BETTER_AUTH_SECRET from the environment, else from .env.local. The secret must be
// the one the server uses (backup codes are encrypted with it).

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { authOptions } from "../server/auth-options.mjs";
import { runMigrations } from "../server/migrate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if ((!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) && existsSync(path.join(root, ".env")) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(path.join(root, ".env"));
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!process.env.DATABASE_URL?.trim()) die("DATABASE_URL is not set (environment or .env.local).");
// The account calls below make no links, so any base URL will do (it only silences Better Auth's warning).
process.env.BETTER_AUTH_URL ||= process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
if ((process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) die("BETTER_AUTH_SECRET must be set (32+ characters) - the same value the server uses.");

// ---------- hidden prompt ----------
let piped;
async function pipedLines() {
  if (!piped) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    piped = data.split(/\r?\n/);
  }
  return piped;
}
function readHidden(prompt) {
  return new Promise((resolve) => {
    process.stderr.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    let typed = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\u0003") {
          process.stderr.write("\n");
          process.exit(130);
        } else if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stderr.write("\n");
          resolve(typed);
          return;
        } else if (ch === "\u007f" || ch === "\b") typed = typed.slice(0, -1);
        else typed += ch;
      }
    };
    stdin.on("data", onData);
    stdin.resume();
  });
}
async function ask(prompt) {
  if (process.stdin.isTTY) return readHidden(prompt);
  const lines = await pipedLines();
  return lines.shift() ?? "";
}
async function newPassword(email) {
  const pw = await ask("New password (hidden, 12+ characters): ");
  if (pw.length <4) die("Use at least 12 characters.");
  if (pw.length > 128) die("Use at most 128 characters.");
  const local = (email ?? "").split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) die("Don't put your email name in the password.");
  const again = await ask("Same password again: ");
  if (again !== pw) die("The two passwords differ.");
  return pw;
}

// ---------- setup ----------
const url = process.env.DATABASE_URL.trim().replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");
const pool = new pg.Pool({ connectionString: url, max: 2 });
const q = (text, params = []) => pool.query(text, params);

async function sessionHeaders(auth, email, password) {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = (headers.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""])
    .map((c) => c.split(";")[0])
    .filter((c) => /session_token=/.test(c))
    .join("; ");
  if (!cookie) throw new Error("Could not sign in with that password.");
  return new Headers({ cookie });
}

async function enable2fa(auth, email, password) {
  const headers = await sessionHeaders(auth, email, password);
  const res = await auth.api.enableTwoFactor({ body: { password, issuer: "Portfolio admin" }, headers });
  await q('DELETE FROM admin_sessions WHERE "userId" = (SELECT id FROM admin_users LIMIT 1)');
  return res?.backupCodes ?? [];
}

function printBackupCodes(codes) {
  if (!codes.length) return;
  console.log("\nBackup codes (each works once if the code step ever fails). Store them somewhere safe - they are not shown again:\n");
  for (const c of codes) console.log(`  ${c}`);
  console.log("");
}

try {
  await runMigrations(pool, { dir: path.join(root, "migrations"), log: (m) => console.log(`[migrate] ${m}`) });
  const { rows } = await q('SELECT id, email, name, "twoFactorEnabled" FROM admin_users WHERE role = \'admin\' ORDER BY "createdAt" LIMIT 1');
  const user = rows[0];

  if (flag("show")) {
    if (!user) die("No admin account yet: npm run admin:create -- --email you@example.com");
    const s = await q('SELECT count(*)::int AS n FROM admin_sessions WHERE "userId" = $1 AND "expiresAt" > now()', [user.id]);
    console.log(`Admin: ${user.email} (${user.name}) · two-factor ${user.twoFactorEnabled ? "on" : "OFF"} · ${s.rows[0].n} signed-in device(s)`);
  } else if (flag("revoke-sessions")) {
    const r = await q("DELETE FROM admin_sessions");
    console.log(`Signed out ${r.rowCount} session(s).`);
  } else if (flag("unlock")) {
    await q("DELETE FROM admin_rate_limits");
    await q('UPDATE admin_two_factor SET "failedVerificationCount" = 0, "lockedUntil" = NULL');
    console.log("Lockouts and rate limits cleared. (A running server also keeps a short in-memory limit: restart it to clear that too.)");
  } else if (value("set-email")) {
    if (!user) die("No admin account yet.");
    const email = value("set-email").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) die("That doesn't look like an email address.");
    await q('UPDATE admin_users SET email = $1, "emailVerified" = true, "updatedAt" = now() WHERE id = $2', [email, user.id]);
    await q("DELETE FROM admin_sessions");
    console.log(`Sign-in email is now ${email}. Every device was signed out.`);
  } else if (flag("reset-password")) {
    if (!user) die("No admin account yet.");
    const pw = await newPassword(user.email);
    const hash = await hashPassword(pw);
    const r = await q(`UPDATE admin_accounts SET password = $1, "updatedAt" = now() WHERE "userId" = $2 AND "providerId" = 'credential'`, [hash, user.id]);
    if (!r.rowCount) die("The account has no password login to reset.");
    await q("DELETE FROM admin_sessions");
    console.log("Password changed. Every device was signed out.");
  } else if (flag("reset-2fa")) {
    if (!user) die("No admin account yet.");
    const password = await ask("Current password (hidden): ");
    await q("DELETE FROM admin_two_factor WHERE \"userId\" = $1", [user.id]);
    await q('UPDATE admin_users SET "twoFactorEnabled" = false WHERE id = $1', [user.id]);
    const auth = betterAuth(authOptions({ pool }));
    printBackupCodes(await enable2fa(auth, user.email, password));
    console.log("Two-factor sign-in is set up again.");
  } else {
    // create
    if (user) die(`An admin account already exists (${user.email}). Use --show, --reset-password or --set-email.`);
    const email = value("email")?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) die("Pass the sign-in email: npm run admin:create -- --email you@example.com");
    const name = value("name") ?? "Admin";
    const password = await newPassword(email);
    const auth = betterAuth(authOptions({ pool, allowSignUp: true }));
    const created = await auth.api.signUpEmail({ body: { email, password, name } });
    await q("UPDATE admin_users SET role = 'admin' WHERE id = $1", [created.user.id]);
    const codes = await enable2fa(auth, email, password);
    console.log(`\nAdmin account created for ${email}. Sign in at /admin/login/ with this email, the password and then the code.`);
    if (process.env.ADMIN_OTP_STATIC) console.log(`The code is currently fixed by ADMIN_OTP_STATIC (no email is sent).`);
    printBackupCodes(codes);
  }
} catch (err) {
  console.error(`Failed: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
