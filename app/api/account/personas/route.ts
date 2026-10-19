import { randomUUID } from "node:crypto";
import { PersonaDocSchema, PersonaDocShape } from "@/lib/persona/schema";
import { bad, forbidden, json, readJson, sameOrigin, str } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { query } from "@/server/db";
import { customerStarterPersona } from "@/server/persona/templates";
import { listOwnedPersonas, loadDraft } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { roleCvName } from "@/lib/persona/training";

export async function GET(req: Request) {
  const session = await customerSession(req);
  if (!session) return bad("Sign in to view your workspace.", 401);
  return json({ ok: true, personas: await listOwnedPersonas(session.userId) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to create a CV.", 401);

  const body = await readJson(req, 5_000);
  const headline = str(body?.headline, 160);
  if (!headline || headline.length < 2) return bad("Enter a professional headline.");

  const existing = await listOwnedPersonas(session.userId);
  let cvNumber = 1;
  for (const persona of existing) {
    const draft = await loadDraft(persona.slug);
    const parsedExisting = PersonaDocShape.safeParse(draft?.doc);
    const existingRole = parsedExisting.success
      ? parsedExisting.data.identity.role ?? parsedExisting.data.identity.headline
      : undefined;
    if (typeof existingRole === "string" && roleCvName(existingRole).toLowerCase() === roleCvName(headline).toLowerCase()) cvNumber += 1;
  }
  const cvName = roleCvName(headline, cvNumber);
  const baseSlug = headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 22) || "profile";
  const slug = `${baseSlug}-${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const doc = customerStarterPersona(headline);
  const parsed = PersonaDocSchema.safeParse(doc);
  if (!parsed.success) return bad("The CV starter couldn't be prepared.", 500);

  const { rowCount } = await query(
    `WITH created AS (
       INSERT INTO personas (slug, name, owner_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING slug
     )
     INSERT INTO persona_drafts (slug, doc, rev)
     SELECT slug, $4::jsonb, 1 FROM created
     RETURNING slug`,
    [slug, cvName, session.userId, JSON.stringify(parsed.data)],
  );
  if (!rowCount) return bad("Couldn't reserve a CV address. Please try again.", 409);
  await recordPlatformEventSafely(session.userId, "profile_created", slug);
  return json({ ok: true, slug }, 201);
}
