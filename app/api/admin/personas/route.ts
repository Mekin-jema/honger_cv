import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { bad, json, readJson, str } from "@/server/http";
import { jobPersonaInput } from "@/server/persona/import-job";
import { createPersona, saveDraft } from "@/server/persona/repo";
import { personaSummaries } from "@/server/persona/studio";
import { blankPersona, marriagePersona } from "@/server/persona/templates";

/** GET: every persona with its live version and draft state. POST: a new persona from a template. */
export async function GET(req: Request) {
  const auth = await adminGuard(req);
  if (isResponse(auth)) return auth;
  return json({ ok: true, personas: await personaSummaries() });
}

export async function POST(req: Request) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const body = await readJson(req, 4_000);
  const slug = str(body?.slug, 32)?.toLowerCase();
  const name = str(body?.name, 60) ?? slug;
  const template = body?.template === "marriage" || body?.template === "job" ? body.template : "blank";
  if (!slug || !SLUG_RE.test(slug)) return bad("Use 2-32 lowercase letters, digits or dashes, starting with a letter.");
  if (!(await createPersona(slug, name ?? slug))) return bad("A persona with that address already exists.", 409);
  const doc = template === "marriage" ? marriagePersona() : template === "job" ? jobPersonaInput() : blankPersona(name ?? slug);
  await saveDraft(slug, { ...doc, name: name ?? doc.name }, 0);
  return json({ ok: true, slug }, 201);
}
