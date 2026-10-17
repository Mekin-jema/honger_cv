import path from "node:path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { pendingMigrations as pending, runMigrations } from "./migrate.mjs";

/**
 * The Postgres connection (DATABASE_URL, e.g. a Neon database). One pool per process, kept on
 * globalThis so dev-server reloads and every route bundle share it. The schema is the SQL files in
 * migrations/, applied in order before the first query (and by `npm run db:migrate`), so a fresh
 * database needs no setup step.
 */

const g = globalThis as typeof globalThis & { __pgPool?: Pool; __pgSchema?: Promise<void> };

export const dbConfigured = () => !!process.env.DATABASE_URL?.trim();

/** The shared pool (also used by the auth library). Throws when DATABASE_URL is not set. */
export function getPool(): Pool {
  if (g.__pgPool) return g.__pgPool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  // pg already verifies the server certificate for sslmode=require (and warns, at length, that libpq
  // wouldn't); saying verify-full keeps that behaviour explicit and the startup log quiet.
  const connectionString = url.replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");
  // Small pool: Neon's pooler sits in front, and this app is a handful of short queries per request.
  g.__pgPool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, query_timeout: 15_000 });
  g.__pgPool.on("error", (err) => console.error("[db] idle client error:", err.message));
  return g.__pgPool;
}

/** migrations/ next to package.json (the app is started from the project folder). */
export const migrationsDir = () => path.join(/*turbopackIgnore: true*/ process.cwd(), "migrations");

/** Applies pending migrations once per process. A failure is retried on the next query. */
export function ensureSchema(): Promise<void> {
  g.__pgSchema ??= runMigrations(getPool(), { dir: migrationsDir(), log: (m) => console.log(`[db] migration ${m}`) }).then(
    () => undefined,
    (err: unknown) => {
      g.__pgSchema = undefined;
      throw err;
    },
  );
  return g.__pgSchema;
}

/** Migrations not applied yet (for /api/health/ and the startup log). */
export const pendingMigrations = () => pending(getPool(), migrationsDir());

/** Runs one parameterised query, making sure the schema is up to date first. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

/**
 * Runs `fn` inside one transaction on one connection (BEGIN ... COMMIT, ROLLBACK on error).
 * Use the given client for every query inside; don't call query() from within (it would wait for
 * another connection).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
