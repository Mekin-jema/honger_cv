import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { CODE_ALPHABET, formatAccessCode, looksLikeAccessCode, normalizeAccessCode } from "@/lib/persona/access-code";
import { query, withTransaction } from "../db";
import { invalidatePersona } from "../persona/cache";
import { UNLOCK_DAYS } from "./cookie";

/**
 * Access codes per persona. Only a hash is stored; the code itself is shown once, when it is made.
 * A code can be limited in uses and time, and revoked; "sign everyone out" bumps the persona's epoch,
 * which voids every unlock cookie issued before.
 */

export type AccessCode = {
  id: string;
  label: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

const hashCode = (slug: string, normalized: string) => createHash("sha256").update(`${slug}:${normalized}`).digest("hex");

export function generateCode(): string {
  const bytes = randomBytes(20);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b & 31];
  return formatAccessCode(out);
}

type CodeDb = { id: string; label: string; max_uses: number | null; uses: number; expires_at: Date | null; revoked_at: Date | null; last_used_at: Date | null; created_at: Date };
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const toCode = (r: CodeDb): AccessCode => ({
  id: r.id,
  label: r.label,
  maxUses: r.max_uses,
  uses: r.uses,
  expiresAt: iso(r.expires_at),
  revokedAt: iso(r.revoked_at),
  lastUsedAt: iso(r.last_used_at),
  createdAt: r.created_at.toISOString(),
});

export async function listCodes(slug: string): Promise<AccessCode[]> {
  const { rows } = await query<CodeDb>("SELECT id, label, max_uses, uses, expires_at, revoked_at, last_used_at, created_at FROM access_codes WHERE slug = $1 ORDER BY created_at DESC LIMIT 200", [slug]);
  return rows.map(toCode);
}

/** A new code (shown once) for `label` ("Rahman family"). */
export async function createCode(slug: string, opts: { label: string; maxUses?: number | null; days?: number | null }): Promise<{ code: string; entry: AccessCode }> {
  const code = generateCode();
  const expires = opts.days ? new Date(Date.now() + opts.days * 86_400_000) : null;
  const { rows } = await query<CodeDb>(
    "INSERT INTO access_codes (id, slug, code_hash, label, max_uses, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, label, max_uses, uses, expires_at, revoked_at, last_used_at, created_at",
    [randomUUID(), slug, hashCode(slug, normalizeAccessCode(code)), opts.label, opts.maxUses ?? null, expires],
  );
  return { code, entry: toCode(rows[0]) };
}

export async function revokeCode(slug: string, id: string): Promise<boolean> {
  const res = await query("UPDATE access_codes SET revoked_at = now() WHERE slug = $1 AND id = $2 AND revoked_at IS NULL", [slug, id]);
  invalidatePersona(slug);
  return (res.rowCount ?? 0) > 0;
}

/** Every unlock issued so far stops working ("sign everyone out"). Codes stay valid for new unlocks. */
export async function resetAccess(slug: string): Promise<number> {
  const { rows } = await query<{ access_epoch: number }>("UPDATE personas SET access_epoch = access_epoch + 1, updated_at = now() WHERE slug = $1 RETURNING access_epoch", [slug]);
  invalidatePersona(slug);
  return rows[0]?.access_epoch ?? 0;
}

export type Redeemed = { ok: true; codeId: string } | { ok: false; reason: "invalid" | "expired" | "used-up" | "revoked" };

/** Checks a typed code and records the unlock (uses + 1, an access_grants row). */
export async function redeemCode(slug: string, typed: string, visitorId: string | undefined): Promise<Redeemed> {
  if (!looksLikeAccessCode(typed)) return { ok: false, reason: "invalid" };
  const hash = hashCode(slug, normalizeAccessCode(typed));
  return withTransaction(async (client) => {
    const { rows } = await client.query<CodeDb>("SELECT * FROM access_codes WHERE code_hash = $1 AND slug = $2 FOR UPDATE", [hash, slug]);
    const row = rows[0];
    if (!row) return { ok: false, reason: "invalid" } as const;
    if (row.revoked_at) return { ok: false, reason: "revoked" } as const;
    if (row.expires_at && row.expires_at.getTime() <= Date.now()) return { ok: false, reason: "expired" } as const;
    if (row.max_uses !== null && row.uses >= row.max_uses) return { ok: false, reason: "used-up" } as const;
    await client.query("UPDATE access_codes SET uses = uses + 1, last_used_at = now() WHERE id = $1", [row.id]);
    await client.query("INSERT INTO access_grants (id, slug, code_id, visitor_id, expires_at) VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))", [
      randomUUID(),
      slug,
      row.id,
      visitorId?.slice(0, 64) ?? null,
      UNLOCK_DAYS,
    ]);
    return { ok: true, codeId: row.id } as const;
  });
}
