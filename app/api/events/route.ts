import { bad, clientKey, extendedVisitor, forbidden, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { questionVisible } from "@/server/persona/compile";
import { personaForRequest } from "@/server/persona/resolve";
import { addEvent } from "@/server/store";

/**
 * Analytics. Without consent only {type, intentId, path} is kept - no visitor id, no device details.
 * With consent the visitor's device details are stored too.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (limited(`events:${clientKey(req)}`, 120, 10 * 60_000)) return bad("Too many events.", 429);
  const body = await readJson(req, 6_000);
  if (!body) return bad("Invalid request.");
  const type = body.type === "pageview" || body.type === "ask" ? body.type : null;
  if (!type) return bad("Unknown event.");
  const { compiled, tier, preview } = await personaForRequest(req);
  if (preview) return json({ ok: true, preview: true }); // the admin looking at a draft is not a visitor
  const raw = typeof body.intentId === "string" ? body.intentId : "";
  const intentId = questionVisible(compiled, raw, tier) || raw === "fallback" || raw === "ai" ? raw : undefined;
  const path = str(body.path, 200);
  const consent = body.consent === true;
  const visitor = consent ? (extendedVisitor(body.visitor, req) ?? undefined) : undefined;

  try {
    await addEvent({ persona: compiled.slug, type, intentId, path, consent, visitor });
  } catch (err) {
    console.error("[events] Could not save:", err);
    return bad("Could not save right now.", 503);
  }
  return json({ ok: true }, 201);
}
