import { v2 as cloudinary } from "cloudinary";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PersonaDocShape, formatIssues } from "@/lib/persona/schema";
import { bad, forbidden, json, limited, readJson, sameOrigin } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { query, withTransaction } from "@/server/db";
import { listOwnedPersonas, loadDraft, personaOwnedBy, saveDraft } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { hasCvPass, CV_PASS_TEMPLATE } from "@/server/billing";
import { isCvTemplateId } from "@/lib/persona/cv-templates";
import { invalidatePersona } from "@/server/persona/cache";
import { cloudinaryCredentials } from "@/server/cloudinary-config";
import { docsDir } from "@/server/persona/pdf";

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
  const nextTemplate = nextDesign?.cvTemplate;
  const isFirstCv = (await listOwnedPersonas(session.userId))[0]?.slug === slug;
  if (
    isCvTemplateId(nextTemplate) &&
    nextTemplate !== previousDesign?.cvTemplate &&
    nextTemplate !== CV_PASS_TEMPLATE &&
    !isFirstCv &&
    !(await hasCvPass(session.userId))
  ) {
    return bad("Upgrade with a lifetime CV Design Pass to unlock all designs for additional CVs.", 402);
  }
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

export async function DELETE(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to delete a CV.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug)) return bad("CV not found.", 404);
  if (limited(`customer-cv-delete:${session.userId}`, 5, 10 * 60_000)) return bad("Too many delete requests. Try again shortly.", 429);

  const result = await withTransaction(async (client) => {
    await client.query("SELECT id FROM admin_users WHERE id = $1 FOR UPDATE", [session.userId]);
    const { rows: personas } = await client.query<{ slug: string }>(
      "SELECT slug FROM personas WHERE slug = $1 AND owner_user_id = $2 FOR UPDATE",
      [slug, session.userId],
    );
    if (!personas.length) return "not_found" as const;

    const { rows: activeJobs } = await client.query(
      "SELECT 1 FROM admin_jobs WHERE slug = $1 AND status IN ('queued', 'running') LIMIT 1",
      [slug],
    );
    if (activeJobs.length) return "busy" as const;

    await client.query("DELETE FROM contacts WHERE persona = $1", [slug]);
    await client.query("DELETE FROM feedback WHERE persona = $1", [slug]);
    await client.query("DELETE FROM votes WHERE persona = $1", [slug]);
    await client.query("DELETE FROM events WHERE persona = $1", [slug]);
    await client.query("DELETE FROM ai_answers WHERE persona = $1", [slug]);
    await client.query(
      "DELETE FROM platform_events WHERE user_id = $1 AND persona_slug = $2",
      [session.userId, slug],
    );
    await client.query("DELETE FROM personas WHERE slug = $1 AND owner_user_id = $2", [slug, session.userId]);
    return "deleted" as const;
  });

  if (result === "not_found") return bad("CV not found.", 404);
  if (result === "busy") return bad("This CV is being published or processed. Try deleting it again when that finishes.", 409);

  invalidatePersona(slug);
  const cleanupWarnings: string[] = [];
  const root = docsDir();
  const documentDirectory = path.resolve(root, slug);
  if (!documentDirectory.startsWith(`${root}${path.sep}`)) {
    cleanupWarnings.push("Local CV files could not be removed.");
  } else {
    try {
      await rm(documentDirectory, { recursive: true, force: true });
    } catch (error) {
      console.error(`[account] Could not remove local CV files for ${slug}:`, error instanceof Error ? error.message : error);
      cleanupWarnings.push("Some locally stored CV files could not be removed.");
    }
  }

  const credentials = cloudinaryCredentials();
  if (credentials) {
    cloudinary.config({ ...credentials, secure: true });
    for (const resourceType of ["image", "raw"] as const) {
      try {
        await cloudinary.api.delete_resources_by_prefix(`honger-cv/customers/${slug}/`, {
          resource_type: resourceType,
          type: "upload",
          invalidate: true,
        });
      } catch (error) {
        console.error(`[account] Could not remove ${resourceType} Cloudinary files for ${slug}:`, error instanceof Error ? error.message : error);
        cleanupWarnings.push("Some uploaded CV files could not be removed.");
        break;
      }
    }
  }

  return json({
    ok: true,
    deleted: true,
    ...(cleanupWarnings.length ? { warning: "Your CV was deleted, but some stored files could not be cleaned up. Please contact support.", cleanupWarnings } : {}),
  });
}
