#!/usr/bin/env node
// Prints the SQL Better Auth needs for the admin login (users, sessions, accounts, verification codes,
// two-factor, rate limits), computed by Better Auth itself from src/server/auth-options.mjs against
// DATABASE_URL. Point it at an EMPTY database to get the full schema, then save it as a migration:
//
//   DATABASE_URL=postgres://.../empty node scripts/auth-schema.mjs > migrations/0004_better_auth.sql
//
// Run it again after upgrading better-auth or adding an auth plugin; against a database that already
// has the tables it prints only what is missing.

import pg from "pg";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "../server/auth-options.mjs";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const plan = await getMigrations(authOptions({ pool }), { throwOnUnsafe: false });
  if (plan.unsafeChanges.length) console.error(`Unsafe changes:\n${plan.unsafeChanges.join("\n")}`);
  const sql = await plan.compileMigrations();
  process.stdout.write(sql.trim() ? `${sql.trim()}\n` : "-- nothing to do\n");
} finally {
  await pool.end();
}
