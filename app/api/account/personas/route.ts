import { randomUUID } from "node:crypto";
import { PersonaDocSchema } from "@/lib/persona/schema";
import { bad, forbidden, json, readJson, sameOrigin, str } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { query } from "@/server/db";
import { blankPersona } from "@/server/persona/templates";
import { listOwnedPersonas } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";

export async function GET(req: Request) {
  const session = await customerSession(req);
  if (!session) return bad("Sign in to view your workspace.", 401);
  return json({ ok: true, personas: await listOwnedPersonas(session.userId) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to create a profile.", 401);

  const body = await readJson(req, 5_000);
  const fullName = str(body?.fullName, 120);
  const headline = str(body?.headline, 160);
  if (!fullName || fullName.length < 2) return bad("Enter your full name.");
  if (!headline || headline.length < 2) return bad("Enter a professional headline.");

  const baseSlug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 22) || "profile";
  const slug = `${baseSlug}-${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const doc = blankPersona(`${fullName.slice(0, 49)}'s profile`, fullName);
  doc.identity.role = headline;
  doc.identity.headline = headline;
  doc.hero.staticIntro = `Hi, I'm ${fullName}, ${headline}.`;
  doc.site = { ...doc.site, indexable: false };
  const parsed = PersonaDocSchema.safeParse(doc);
  if (!parsed.success) return bad("The profile starter couldn't be prepared.", 500);

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
    [slug, doc.name, session.userId, JSON.stringify(parsed.data)],
  );
  if (!rowCount) return bad("Couldn't reserve a profile address. Please try again.", 409);
  await recordPlatformEventSafely(session.userId, "profile_created", slug);
  return json({ ok: true, slug }, 201);
}
