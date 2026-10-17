import { bad, clientKey, consentedVisitor, forbidden, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { questionVisible } from "@/server/persona/compile";
import { personaForRequest } from "@/server/persona/resolve";
import { castVote } from "@/server/store";

/** One vote per visitor per answer wording. value null removes the vote. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (limited(`vote:${clientKey(req)}`, 60, 10 * 60_000)) return bad("Too many votes.", 429);
  const body = await readJson(req, 4_000);
  if (!body) return bad("Invalid request.");
  // Device details only with consent; otherwise just the anonymous visitor id.
  const visitor = consentedVisitor(body, req);
  const intentId = typeof body.intentId === "string" ? body.intentId : "";
  // A vote on an AI answer names the aiAnswers entry it rates.
  const answerId = intentId === "ai" ? str(body.answerId, 64) : undefined;
  const variant = typeof body.variant === "number" && Number.isInteger(body.variant) && body.variant >= 0 && body.variant < 100 ? body.variant : -1;
  const value = body.value === "up" || body.value === "down" ? body.value : body.value === null ? null : undefined;
  if (!visitor) return bad("Missing visitor id.");
  const { compiled, tier, preview } = await personaForRequest(req);
  if (preview) return json({ ok: true, value });
  if (!questionVisible(compiled, intentId, tier) && intentId !== "fallback" && !(intentId === "ai" && answerId)) return bad("Unknown answer.");
  if (variant < 0 || value === undefined) return bad("Invalid vote.");

  let result: boolean;
  try {
    result = await castVote({ persona: compiled.slug, visitor, intentId, variant, answerId, value });
  } catch (err) {
    console.error("[vote] Could not save:", err);
    return bad("Could not save right now.", 503);
  }
  return result ? json({ ok: true, value }) : bad("Vote store is full.", 507);
}
