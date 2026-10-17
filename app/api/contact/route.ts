import { bad, clientKey, consentedVisitor, forbidden, isEmail, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { personaForRequest } from "@/server/persona/resolve";
import { addContact } from "@/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (limited(`contact:${clientKey(req)}`, 5, 10 * 60_000)) return bad("Too many messages - please try again later.", 429);
  const body = await readJson(req);
  if (!body) return bad("Invalid request.");
  if (str(body.website, 200)) return json({ ok: true }); // honeypot: bots fill hidden fields

  // Device details only with consent; otherwise just the anonymous visitor id.
  const visitor = consentedVisitor(body, req);
  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const company = str(body.company, 160);
  const message = str(body.message, 4000);
  if (!visitor) return bad("Missing visitor id.");
  if (!name) return bad("Please add your name.");
  if (!email || !isEmail(email)) return bad("Please add a valid email address.");
  if (!message || message.length < 5) return bad("Please write a short message.");

  let saved: boolean;
  try {
    const { slug, preview } = await personaForRequest(req);
    if (preview) return json({ ok: true, preview: true }, 201); // a test from the draft preview
    saved = await addContact({ persona: slug, visitor, name, email, company, message });
  } catch (err) {
    console.error("[contact] Could not save:", err);
    return bad("Could not save right now.", 503);
  }
  return saved ? json({ ok: true }, 201) : bad("Inbox is full right now - please email instead.", 507);
}
