import "server-only";
import { PersonaDocSchema } from "@/lib/persona/schema";
import type { Tier } from "@/lib/persona/types";
import { signToken, verifyToken } from "../access/cookie";
import { getAuth } from "../auth";
import { dbConfigured } from "../db";
import { compilePersona, type CompiledPersona } from "./compile";
import { loadDraft } from "./repo";

/**
 * Draft preview: the admin sees a persona's unpublished draft on the real site, in their own browser
 * only, as a public visitor or as a visitor with an access code. A signed cookie names the persona and
 * the tier; it only counts together with a valid admin session, so a copied cookie shows nothing to
 * anyone else. Nothing a preview request does is recorded (see ResolvedPersona.preview).
 */

export const PREVIEW_COOKIE = "pv";
export const PREVIEW_SECONDS = 2 * 3600;

export const previewToken = (slug: string, tier: Tier, now = Date.now()) =>
  signToken("preview", `${slug}.${tier}.${Math.floor(now / 1000) + PREVIEW_SECONDS}`);

/** The persona and tier a valid, unexpired preview cookie asks for. */
export function readPreview(value: string | undefined, now = Date.now()): { slug: string; tier: Tier } | null {
  const payload = verifyToken("preview", value);
  if (!payload) return null;
  const [slug, tier, exp] = payload.split(".");
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug ?? "") || (tier !== "public" && tier !== "unlocked")) return null;
  return /^\d+$/.test(exp ?? "") && Number(exp) * 1000 > now ? { slug, tier } : null;
}

const cache = new Map<string, CompiledPersona>();

/**
 * The compiled draft of `slug` for an admin's request. null when there is no admin session or no draft;
 * `invalid` when the draft doesn't pass the schema (the live version is shown, with a notice).
 */
export async function previewPersona(slug: string, headers: Headers): Promise<{ compiled: CompiledPersona } | { invalid: true } | null> {
  if (!dbConfigured()) return null;
  try {
    const session = await getAuth().api.getSession({ headers });
    if (!session || !(session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled) return null;
    const draft = await loadDraft(slug);
    if (!draft) return null;
    const key = `${slug}:${draft.rev}`;
    const hit = cache.get(key);
    if (hit) return { compiled: hit };
    const parsed = PersonaDocSchema.safeParse(draft.doc);
    if (!parsed.success) return { invalid: true };
    const compiled = compilePersona(slug, parsed.data, { versionId: null, number: -1, publishedAt: draft.updatedAt });
    if (cache.size >= 20) cache.clear();
    cache.set(key, compiled);
    return { compiled };
  } catch (err) {
    console.error("[preview] Could not load the draft:", err instanceof Error ? err.message : err);
    return null;
  }
}
