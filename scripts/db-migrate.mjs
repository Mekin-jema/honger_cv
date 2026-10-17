#!/usr/bin/env node
// npm run db:migrate            applies pending migrations (migrations/*.sql) to DATABASE_URL
// npm run db:migrate -- --check lists pending migrations without applying them (exit code 2 if any)
//
// The app applies them by itself on start, so this is for deploy scripts and for checking first.
// DATABASE_URL comes from the environment, else from .env.local.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pendingMigrations, runMigrations } from "../server/migrate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.DATABASE_URL && existsSync(path.join(root, ".env")) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(path.join(root, ".env"));
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}

const dir = path.join(root, "migrations");
const pool = new pg.Pool({ connectionString: url.replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full"), max: 2, connectionTimeoutMillis: 15_000 });

try {
  if (process.argv.includes("--check")) {
    const pending = await pendingMigrations(pool, dir);
    console.log(pending.length ? `[migrate] pending: ${pending.join(", ")}` : "[migrate] up to date");
    process.exitCode = pending.length ? 2 : 0;
  } else {
    const report = await runMigrations(pool, { dir, log: (m) => console.log(`[migrate] ${m}`) });
    if (!report.applied.length && !report.skipped.length) console.log("[migrate] up to date");
  }
} catch (err) {
  console.error(`[migrate] ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
