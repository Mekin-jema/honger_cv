// Applies the SQL files in migrations/ in order, once each, recorded in schema_migrations.
// Plain JavaScript so both the app (src/server/db.ts) and `npm run db:migrate` (scripts/db-migrate.mjs)
// use the same code. Each file runs in its own transaction holding an advisory lock, so two processes
// starting at once never apply the same file twice. A file whose first line is "-- optional" may fail
// (e.g. no pgvector): it is skipped with a warning and tried again on the next start.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const LOCK_ID = 7274011;
const FILE_RE = /^\d{4}_[a-z0-9_-]+\.sql$/;

/**
 * @typedef {{ name: string, sql: string, optional: boolean }} Migration
 * @typedef {{ applied: string[], skipped: { name: string, error: string }[] }} MigrationReport
 */

/**
 * @param {string} dir
 * @returns {Migration[]}
 */
export function listMigrations(dir) {
  return readdirSync(/*turbopackIgnore: true*/ dir)
    .filter((f) => FILE_RE.test(f))
    .sort()
    .map((file) => {
      const sql = readFileSync(/*turbopackIgnore: true*/ path.join(dir, file), "utf8");
      return { name: file.replace(/\.sql$/, ""), sql, optional: /^--\s*optional\b/.test(sql) };
    });
}

/**
 * @param {import("pg").Pool} pool
 * @param {(client: import("pg").PoolClient) => Promise<boolean>} work returns true to commit
 */
async function locked(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [LOCK_ID]);
    const commit = await work(client);
    await client.query(commit ? "COMMIT" : "ROLLBACK");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Applies every pending migration in `dir`.
 * @param {import("pg").Pool} pool
 * @param {{ dir: string, log?: (message: string) => void }} options
 * @returns {Promise<MigrationReport>}
 */
export async function runMigrations(pool, { dir, log = () => {} }) {
  const migrations = listMigrations(dir);
  /** @type {MigrationReport} */
  const report = { applied: [], skipped: [] };

  await locked(pool, async (client) => {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    return true;
  });
  const done = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));

  for (const m of migrations) {
    if (done.has(m.name)) continue;
    try {
      let applied = false;
      await locked(pool, async (client) => {
        // Another process may have applied it while this one waited for the lock.
        const again = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [m.name]);
        if (again.rowCount) return false;
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [m.name]);
        applied = true;
        return true;
      });
      // Only once the commit went through.
      if (applied) {
        report.applied.push(m.name);
        log(`applied ${m.name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!m.optional) throw new Error(`Migration ${m.name} failed: ${message}`);
      report.skipped.push({ name: m.name, error: message });
      log(`skipped optional ${m.name}: ${message}`);
    }
  }
  return report;
}

/**
 * Names of migrations in `dir` that are not applied yet.
 * @param {import("pg").Pool} pool
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function pendingMigrations(pool, dir) {
  const exists = await pool.query("SELECT to_regclass('schema_migrations') IS NOT NULL AS ok");
  const done = exists.rows[0]?.ok ? new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name)) : new Set();
  return listMigrations(dir)
    .filter((m) => !done.has(m.name))
    .map((m) => m.name);
}
