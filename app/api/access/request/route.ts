import { bad, clientKey, consentedVisitor, forbidden, isEmail, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { personaForRequest } from "@/server/persona/resolve";
import { addContact } from "@/server/store";

/**
 * POST { name, relation, phone, email, message }: asks the owner for an access code. It lands in the
 * admin (inbox and the persona's Document & access tab), where the owner approves it with a new code
 * and sends that code to the person, or declines.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (limited(`access-request:${clientKey(req)}`, 3, 60 * 60_000)) return bad("Too many requests - please try again later.", 429);
  const { compiled, slug, preview } = await personaForRequest(req);
  if (compiled.doc.access.mode !== "request") return bad("Requests are not open here.", 404);
  const body = await readJson(req, 8_000);
  if (!body) return bad("Invalid request.");
  if (str(body.website, 200)) return json({ ok: true }); // honeypot
  const visitor = consentedVisitor(body, req);
  const name = str(body.name, 120);
  const relation = str(body.relation, 120);
  const phone = str(body.phone, 40);
  const email = str(body.email, 200);
  const message = str(body.message, 2000) ?? "";
  if (!visitor) return bad("Missing visitor id.");
  if (!name || name.length < 2) return bad("Please add your name.");
  if (!phone && !email) return bad("Add a phone number or an email address.");
  if (email && !isEmail(email)) return bad("That email address doesn't look right.");
  if (phone && !/^[+\d][\d\s().-]{5,38}$/.test(phone)) return bad("That phone number doesn't look right.");
  if (preview) return json({ ok: true, preview: true }, 201);
  try {
    const saved = await addContact({ persona: slug, kind: "access", visitor, name, email, phone, relation, message: message || "(no message)" });
    return saved ? json({ ok: true }, 201) : bad("The request box is full right now.", 507);
  } catch (err) {
    console.error("[access-request] Could not save:", err);
    return bad("Could not save right now.", 503);
  }
}
