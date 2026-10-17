import { bad, clientKey, consentedVisitor, forbidden, isEmail, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { personaForRequest } from "@/server/persona/resolve";
import { addFeedback } from "@/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (limited(`feedback:${clientKey(req)}`, 8, 10 * 60_000)) return bad("Too much feedback at once - please try again later.", 429);
  const body = await readJson(req);
  if (!body) return bad("Invalid request.");
  if (str(body.website, 200)) return json({ ok: true }); // honeypot

  // Device details only with consent; otherwise just the anonymous visitor id.
  const visitor = consentedVisitor(body, req);
  const rating = typeof body.rating === "number" && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
  const message = str(body.message, 4000) ?? "";
  const name = str(body.name, 120);
  const email = str(body.email, 200);
  if (!visitor) return bad("Missing visitor id.");
  if (!rating && message.length < 3) return bad("Pick a rating or write a few words.");
  if (email && !isEmail(email)) return bad("That email address doesn't look right.");

  let saved: boolean;
  try {
    const { slug, preview } = await personaForRequest(req);
    if (preview) return json({ ok: true, preview: true }, 201); // a test from the draft preview
    saved = await addFeedback({ persona: slug, visitor, rating, message, name, email });
  } catch (err) {
    console.error("[feedback] Could not save:", err);
    return bad("Could not save right now.", 503);
  }
  return saved ? json({ ok: true }, 201) : bad("Feedback box is full right now.", 507);
}
