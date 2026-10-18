import { bad, clientKey, forbidden, json, limited, sameOrigin } from "@/server/http";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { publicPersona } from "@/server/persona/public";
import { personaOwnerUserId } from "@/server/persona/repo";

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const { slug } = await context.params;
  if (limited(`public-cv-export:${slug}:${clientKey(req)}`, 10, 10 * 60_000)) return bad("Too many export requests.", 429);
  if (!(await publicPersona(slug))) return bad("Profile not found.", 404);
  const ownerUserId = await personaOwnerUserId(slug);
  if (!ownerUserId) return bad("Profile not found.", 404);
  await recordPlatformEventSafely(ownerUserId, "pdf_print_requested", slug);
  return json({ ok: true });
}
