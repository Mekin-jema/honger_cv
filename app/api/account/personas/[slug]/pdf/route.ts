import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, limited, sameOrigin } from "@/server/http";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { personaOwnedBy } from "@/server/persona/repo";

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to track this export.", 401);
  const { slug } = await context.params;
  if (limited(`customer-cv-export:${session.userId}:${slug}`, 20, 10 * 60_000)) return bad("Too many export requests.", 429);
  if (!(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);
  await recordPlatformEventSafely(session.userId, "pdf_print_requested", slug);
  return json({ ok: true });
}
