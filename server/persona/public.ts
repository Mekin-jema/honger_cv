import "server-only";
import type { ResolvedPersona } from "./resolve";
import { getPersona } from "./cache";

const SLUG = /^[a-z][a-z0-9-]{1,31}$/;

export async function publicPersona(slug: string): Promise<ResolvedPersona | null> {
  if (!SLUG.test(slug)) return null;
  const cached = await getPersona(slug);
  if (!cached?.compiled.versionId || cached.compiled.doc.legacy) return null;
  return {
    slug,
    compiled: cached.compiled,
    tier: "public",
    lang: cached.compiled.doc.site.defaultLang,
    base: `/u/${slug}`,
    accessEpoch: cached.accessEpoch,
    preview: null,
    wrongLang: false,
  };
}
