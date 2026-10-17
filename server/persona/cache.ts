import "server-only";
import { PersonaDocSchema } from "@/lib/persona/schema";
import { dbConfigured } from "../db";
import { compilePersona, type CompiledPersona } from "./compile";
import { jobPersonaDoc } from "./import-job";
import { hostRows, loadVersion, publishedPointer, revokedCodes } from "./repo";

/**
 * The published personas, kept in memory. Visitors never wait for the database except on the very
 * first request of a process: after that each persona is re-checked (one indexed read) at most once a
 * minute in the background, and a publish clears its entry straight away. When the database is
 * unreachable, or nothing has been published yet, the job persona is built from the code content, so
 * the site keeps working with no database at all.
 */

/** How long an entry is trusted before the next background check. */
const RECHECK_MS = 60_000;
/** The first load of a persona waits at most this long for the database, then serves what it has. */
const FIRST_LOAD_MS = 2_500;
/** After a database failure, try again this soon. */
const RETRY_MS = 10_000;

type Entry = { compiled: CompiledPersona | null; accessEpoch: number; revoked: ReadonlySet<string>; checkedAt: number; refreshing?: Promise<void> };
const NONE: ReadonlySet<string> = new Set();
type HostState = { map: Map<string, string>; checkedAt: number; refreshing?: Promise<void> };

const g = globalThis as typeof globalThis & {
  __personas?: Map<string, Entry>;
  __personaHosts?: HostState;
};
const cache = (g.__personas ??= new Map());

export const DEFAULT_PERSONA = () => {
  const slug = process.env.DEFAULT_PERSONA?.trim().toLowerCase();
  return slug && /^[a-z][a-z0-9-]{1,31}$/.test(slug) ? slug : "job";
};

let codeJob: CompiledPersona | undefined;
/** Built from src/content: only the job persona has a code version. */
export function codeSnapshot(slug: string): CompiledPersona | null {
  if (slug !== "job") return null;
  codeJob ??= compilePersona("job", jobPersonaDoc(), { number: 0 });
  return codeJob;
}

let warned = false;
const warnOnce = (err: unknown) => {
  if (warned) return;
  warned = true;
  console.error("[persona] Could not read the published personas; serving the code content until the database answers:", err instanceof Error ? err.message : err);
};

async function load(slug: string, entry: Entry | undefined): Promise<Entry> {
  if (!dbConfigured()) return { compiled: codeSnapshot(slug), accessEpoch: 0, revoked: NONE, checkedAt: Date.now() };
  try {
    const pointer = await publishedPointer(slug);
    warned = false;
    const versionId = pointer?.versionId ?? null;
    const accessEpoch = pointer?.accessEpoch ?? 0;
    const revoked = pointer ? new Set(await revokedCodes(slug)) : NONE;
    if (!versionId) return { compiled: codeSnapshot(slug), accessEpoch, revoked, checkedAt: Date.now() };
    if (entry?.compiled?.versionId === versionId) return { ...entry, accessEpoch, revoked, checkedAt: Date.now(), refreshing: undefined };
    const version = await loadVersion(versionId);
    const parsed = version ? PersonaDocSchema.safeParse(version.doc) : null;
    if (!version || !parsed?.success) {
      console.error(`[persona] Published version ${versionId} of "${slug}" is missing or invalid; serving the previous content.`);
      return { compiled: entry?.compiled ?? codeSnapshot(slug), accessEpoch, revoked, checkedAt: Date.now() };
    }
    const compiled = compilePersona(slug, parsed.data, { versionId, number: version.number, publishedAt: version.publishedAt ?? version.createdAt, pdfPath: version.pdfPath });
    return { compiled, accessEpoch, revoked, checkedAt: Date.now() };
  } catch (err) {
    warnOnce(err);
    // Keep what we had; check again soon.
    return { compiled: entry?.compiled ?? codeSnapshot(slug), accessEpoch: entry?.accessEpoch ?? 0, revoked: entry?.revoked ?? NONE, checkedAt: Date.now() - RECHECK_MS + RETRY_MS };
  }
}

function refresh(slug: string, entry: Entry | undefined): Promise<void> {
  if (entry?.refreshing) return entry.refreshing;
  const p = load(slug, entry).then((next) => {
    cache.set(slug, next);
  });
  if (entry) entry.refreshing = p;
  else cache.set(slug, { compiled: null, accessEpoch: 0, revoked: NONE, checkedAt: 0, refreshing: p });
  return p;
}

const timeout = (ms: number) => new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms).unref?.());

/**
 * The published persona `slug` (null if it doesn't exist). Serves the cached copy and refreshes it in
 * the background when it is older than a minute.
 */
export type CachedPersona = { compiled: CompiledPersona; accessEpoch: number; revoked: ReadonlySet<string> };

export async function getPersona(slug: string): Promise<CachedPersona | null> {
  const entry = cache.get(slug);
  // Recently checked (a persona that doesn't exist is remembered too, so it costs no query per request).
  if (entry && !entry.refreshing && Date.now() - entry.checkedAt < RECHECK_MS) {
    return entry.compiled ? { compiled: entry.compiled, accessEpoch: entry.accessEpoch, revoked: entry.revoked } : null;
  }
  if (entry?.compiled) {
    void refresh(slug, entry).catch(() => {});
    return { compiled: entry.compiled, accessEpoch: entry.accessEpoch, revoked: entry.revoked };
  }
  // First load in this process: wait (briefly) for the database.
  const outcome = await Promise.race([refresh(slug, entry), timeout(FIRST_LOAD_MS)]);
  const loaded = cache.get(slug);
  if (outcome === "timeout" && !loaded?.compiled) {
    const code = codeSnapshot(slug);
    return code ? { compiled: code, accessEpoch: 0, revoked: NONE } : null;
  }
  return loaded?.compiled ? { compiled: loaded.compiled, accessEpoch: loaded.accessEpoch, revoked: loaded.revoked } : null;
}

/** After a publish, rollback or unlock reset: the next request loads the new state. */
export function invalidatePersona(slug: string) {
  cache.delete(slug);
  if (g.__personaHosts) g.__personaHosts.checkedAt = 0;
}

/** host -> persona slug from PERSONA_HOSTS (env) and the persona_hosts table (cached for a minute). */
export async function hostMap(): Promise<Map<string, string>> {
  const fromEnv = new Map<string, string>();
  // PERSONA_HOSTS="job=maruf.dev,www.maruf.dev;marriage=biodata.example.com"
  for (const part of (process.env.PERSONA_HOSTS ?? "").split(";")) {
    const [slug, hosts] = part.split("=");
    if (!slug || !hosts) continue;
    for (const h of hosts.split(",")) if (h.trim()) fromEnv.set(h.trim().toLowerCase(), slug.trim().toLowerCase());
  }
  if (!dbConfigured()) return fromEnv;
  const state: HostState = (g.__personaHosts ??= { map: new Map(), checkedAt: 0 });
  if (Date.now() - state.checkedAt >= RECHECK_MS && !state.refreshing) {
    state.refreshing = hostRows()
      .then((rows) => {
        state.map = new Map(rows.map((r) => [r.host.toLowerCase(), r.slug]));
        state.checkedAt = Date.now();
      })
      .catch((err) => {
        warnOnce(err);
        state.checkedAt = Date.now() - RECHECK_MS + RETRY_MS;
      })
      .finally(() => {
        state.refreshing = undefined;
      });
    if (!state.map.size) await Promise.race([state.refreshing, timeout(FIRST_LOAD_MS)]);
  }
  // The environment wins over the database (it is the deploy's explicit choice).
  return new Map([...state.map, ...fromEnv]);
}
