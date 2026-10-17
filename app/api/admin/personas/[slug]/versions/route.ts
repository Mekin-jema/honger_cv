import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson, str } from "@/server/http";
import { activateVersion } from "@/server/persona/publish";
import { listPersonas, listVersions } from "@/server/persona/repo";

type Ctx = { params: Promise<{ slug: string }> };

/** GET: published versions, newest first. POST { versionId }: make that version live again (rollback). */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) return bad("No such persona.", 404);
  const [versions, personas] = await Promise.all([listVersions(slug, 30), listPersonas()]);
  const liveId = personas.find((p) => p.slug === slug)?.publishedVersionId ?? null;
  // listVersions leaves the documents out (they can be large); the editor loads one when needed.
  return json({ ok: true, liveId, versions });
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  const body = await readJson(req, 1_000);
  const versionId = str(body?.versionId, 64);
  if (!SLUG_RE.test(slug) || !versionId) return bad("Say which version.");
  return (await activateVersion(slug, versionId)) ? json({ ok: true }) : bad("That version can't be made live (it doesn't exist or didn't finish publishing).", 404);
}
