import { PersonaDocShape, formatIssues } from "@/lib/persona/schema";
import { bad, forbidden, json, readJson, sameOrigin } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { query } from "@/server/db";
import { loadDraft, personaOwnedBy, saveDraft } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";

type Context = { params: Promise<{ slug: string }> };
const SLUG = /^[a-z][a-z0-9-]{1,31}$/;

export async function GET(req: Request, context: Context) {
  const session = await customerSession(req);
  if (!session) return bad("Sign in to open your profile.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);
  const draft = await loadDraft(slug);
  if (!draft) return bad("This profile has no editable draft.", 404);
  return json({ ok: true, ...draft });
}

export async function PUT(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to update your profile.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);

  const body = await readJson(req, 2_000_000);
  const parsed = PersonaDocShape.safeParse(body?.doc);
  if (!body || !parsed.success) {
    return bad(
      `Fix the profile fields before saving: ${parsed.success ? "Missing profile data." : formatIssues(parsed.error, 8).join("; ")}`,
      422,
    );
  }
  if (parsed.data.document?.kind === "biodata") return bad("Customer profiles must remain Job CVs.", 422);
  const rev = typeof body.rev === "number" && Number.isInteger(body.rev) && body.rev >= 0 ? body.rev : -1;
  if (rev < 0) return bad("Missing the draft revision. Reload before saving.");

  const previousDraft = await loadDraft(slug);
  const previousDoc = PersonaDocShape.safeParse(previousDraft?.doc);
  const previousDesign = previousDoc.success ? previousDoc.data.document.data : undefined;
  const nextDesign = parsed.data.document.data;
  const designChanged =
    previousDesign?.cvTemplate !== nextDesign?.cvTemplate ||
    previousDesign?.cvAccent !== nextDesign?.cvAccent;
  const next = await saveDraft(slug, parsed.data, rev);
  if (next === null) return bad("This draft changed in another tab. Reload and try again.", 409);
  await query("UPDATE personas SET name = $3, updated_at = now() WHERE slug = $1 AND owner_user_id = $2", [
    slug,
    session.userId,
    parsed.data.name,
  ]);
  await recordPlatformEventSafely(session.userId, "draft_saved", slug);
  if (designChanged && nextDesign?.cvTemplate && typeof nextDesign.cvAccent === "string") {
    await recordPlatformEventSafely(session.userId, "template_saved", slug, {
      template: String(nextDesign.cvTemplate),
      accent: nextDesign.cvAccent,
    });
  }
  return json({ ok: true, rev: next });
}
