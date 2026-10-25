import { randomUUID } from "node:crypto";
import { PersonaDocSchema, PersonaDocShape } from "@/lib/persona/schema";
import { bad, forbidden, json, readJson, sameOrigin, str } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { withTransaction } from "@/server/db";
import { customerStarterPersona } from "@/server/persona/templates";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { roleCvName } from "@/lib/persona/training";
import { hasCvPass } from "@/server/billing";
import { listOwnedPersonas } from "@/server/persona/repo";

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
  const cvName = str(body?.cvName, 60) ?? headline;
  if (!headline || headline.length < 2 || !cvName || cvName.length < 2) return bad("Enter a name for this CV.");

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

  const result = await withTransaction(async (client) => {
    await client.query("SELECT id FROM admin_users WHERE id = $1 FOR UPDATE", [session.userId]);
    const { rows: existing } = await client.query<{ slug: string; doc: unknown }>(
      `SELECT p.slug, d.doc
         FROM personas p
         LEFT JOIN persona_drafts d ON d.slug = p.slug
        WHERE p.owner_user_id = $1
        ORDER BY p.created_at, p.slug`,
      [session.userId],
    );
    if (existing.length && !(await hasCvPass(session.userId))) {
      return { kind: "payment_required" as const, existingCount: existing.length };
    }

    let cvNumber = 1;
    for (const persona of existing) {
      const parsedExisting = PersonaDocShape.safeParse(persona.doc);
      const existingRole = parsedExisting.success
        ? parsedExisting.data.identity.role ?? parsedExisting.data.identity.headline
        : undefined;
      if (typeof existingRole === "string" && roleCvName(existingRole).toLowerCase() === roleCvName(headline).toLowerCase()) cvNumber += 1;
    }
    const generatedName = cvName === headline ? roleCvName(headline, cvNumber) : cvName;
    parsed.data.name = generatedName;
    doc.name = generatedName;

    const { rowCount } = await client.query(
      `WITH created AS (
         INSERT INTO personas (slug, name, owner_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING
         RETURNING slug
       )
       INSERT INTO persona_drafts (slug, doc, rev)
       SELECT slug, $4::jsonb, 1 FROM created
       RETURNING slug`,
      [slug, generatedName, session.userId, JSON.stringify(parsed.data)],
    );
    return rowCount
      ? { kind: "created" as const }
      : { kind: "conflict" as const };
  });
  if (result.kind === "payment_required") {
    return json({
      ok: false,
      needsPayment: true,
      existingCount: result.existingCount,
      error: "Your first CV is free. Buy a lifetime CV Design Pass to create additional CVs.",
    }, 402);
  }
  if (result.kind === "conflict") return bad("Couldn't reserve a CV address. Please try again.", 409);
  await recordPlatformEventSafely(session.userId, "profile_created", slug);
  return json({ ok: true, slug }, 201);
}
