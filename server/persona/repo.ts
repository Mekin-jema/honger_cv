import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";

/** SQL for personas, drafts, versions and hosts. Documents are stored as jsonb and validated on the way in. */

export type PersonaRow = { slug: string; name: string; publishedVersionId: string | null; accessEpoch: number; updatedAt: string };

export type VersionRow = {
  id: string;
  slug: string;
  number: number;
  docHash: string;
  doc: unknown;
  report: Record<string, unknown>;
  status: "building" | "ready" | "failed";
  pdfPath: string | null;
  createdAt: string;
  publishedAt: string | null;
};

const iso = (d: Date | string | null) => (d === null ? null : (d instanceof Date ? d : new Date(d)).toISOString());

type VersionDb = {
  id: string;
  slug: string;
  number: number;
  doc_hash: string;
  doc: unknown;
  report: Record<string, unknown>;
  status: VersionRow["status"];
  pdf_path: string | null;
  created_at: Date;
  published_at: Date | null;
};
const toVersion = (r: VersionDb): VersionRow => ({
  id: r.id,
  slug: r.slug,
  number: r.number,
  docHash: r.doc_hash,
  doc: r.doc,
  report: r.report ?? {},
  status: r.status,
  pdfPath: r.pdf_path,
  createdAt: iso(r.created_at)!,
  publishedAt: iso(r.published_at),
});

/** The live version id and the unlock epoch: one indexed read, done at most once a minute per persona. */
export async function publishedPointer(slug: string): Promise<{ versionId: string | null; accessEpoch: number } | null> {
  const { rows } = await query<{ published_version_id: string | null; access_epoch: number }>(
    "SELECT published_version_id, access_epoch FROM personas WHERE slug = $1",
    [slug],
  );
  return rows[0] ? { versionId: rows[0].published_version_id, accessEpoch: rows[0].access_epoch } : null;
}

export async function loadVersion(id: string): Promise<VersionRow | null> {
  const { rows } = await query<VersionDb>("SELECT * FROM persona_versions WHERE id = $1", [id]);
  return rows[0] ? toVersion(rows[0]) : null;
}

export async function listVersions(slug: string, limit = 20): Promise<VersionRow[]> {
  const { rows } = await query<VersionDb>(
    "SELECT id, slug, number, doc_hash, '{}'::jsonb AS doc, report, status, pdf_path, created_at, published_at FROM persona_versions WHERE slug = $1 ORDER BY number DESC LIMIT $2",
    [slug, limit],
  );
  return rows.map(toVersion);
}

/** Revoked access codes of a persona: their unlock cookies stop working (checked with the cached persona). */
export async function revokedCodes(slug: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>("SELECT id::text AS id FROM access_codes WHERE slug = $1 AND revoked_at IS NOT NULL", [slug]);
  return rows.map((r) => r.id);
}

/** host -> persona slug, for PERSONA_ROUTING=host. */
export async function hostRows(): Promise<{ host: string; slug: string }[]> {
  const { rows } = await query<{ host: string; slug: string }>("SELECT host, slug FROM persona_hosts");
  return rows;
}

export async function listPersonas(): Promise<PersonaRow[]> {
  const { rows } = await query<{ slug: string; name: string; published_version_id: string | null; access_epoch: number; updated_at: Date }>(
    "SELECT slug, name, published_version_id, access_epoch, updated_at FROM personas ORDER BY created_at, slug",
  );
  return rows.map((r) => ({ slug: r.slug, name: r.name, publishedVersionId: r.published_version_id, accessEpoch: r.access_epoch, updatedAt: iso(r.updated_at)! }));
}

export async function createPersona(slug: string, name: string): Promise<boolean> {
  const res = await query("INSERT INTO personas (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING", [slug, name]);
  return (res.rowCount ?? 0) > 0;
}

// ---------- drafts ----------

export type DraftRow = { slug: string; doc: unknown; rev: number; updatedAt: string };

export async function loadDraft(slug: string): Promise<DraftRow | null> {
  const { rows } = await query<{ slug: string; doc: unknown; rev: number; updated_at: Date }>("SELECT slug, doc, rev, updated_at FROM persona_drafts WHERE slug = $1", [slug]);
  return rows[0] ? { slug: rows[0].slug, doc: rows[0].doc, rev: rows[0].rev, updatedAt: iso(rows[0].updated_at)! } : null;
}

/**
 * Saves a draft if nobody saved since `baseRev` (0 = there was no draft yet). Returns the new revision,
 * or null on a conflict (another tab saved first).
 */
export async function saveDraft(slug: string, doc: unknown, baseRev: number): Promise<number | null> {
  if (baseRev === 0) {
    const { rows } = await query<{ rev: number }>(
      "INSERT INTO persona_drafts (slug, doc, rev) VALUES ($1, $2, 1) ON CONFLICT (slug) DO NOTHING RETURNING rev",
      [slug, JSON.stringify(doc)],
    );
    return rows[0]?.rev ?? null;
  }
  const { rows } = await query<{ rev: number }>(
    "UPDATE persona_drafts SET doc = $2, rev = rev + 1, updated_at = now() WHERE slug = $1 AND rev = $3 RETURNING rev",
    [slug, JSON.stringify(doc), baseRev],
  );
  return rows[0]?.rev ?? null;
}

// ---------- publishing (inside a transaction) ----------

export async function nextVersionNumber(client: PoolClient, slug: string): Promise<number> {
  const { rows } = await client.query<{ n: number }>("SELECT COALESCE(MAX(number), 0) + 1 AS n FROM persona_versions WHERE slug = $1", [slug]);
  return rows[0].n;
}
