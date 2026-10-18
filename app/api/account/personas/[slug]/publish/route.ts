import { bad, forbidden, json, limited, sameOrigin } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { PublishError, startPublish } from "@/server/persona/publish";
import { personaOwnedBy } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";

export const maxDuration = 300;

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to publish this profile.", 401);
  const { slug } = await context.params;
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, session.userId))) {
    return bad("Profile not found.", 404);
  }
  if (limited(`customer-publish:${session.userId}:${slug}`, 3, 60 * 60_000)) {
    return bad("You have published recently. Please try again later.", 429);
  }

  try {
    const selfOrigin = process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : new URL(req.url).origin;
    const result = await startPublish(slug, { selfOrigin });
    if (result.unchanged) return json({ ok: true, unchanged: true });
    await recordPlatformEventSafely(session.userId, "publish_started", slug);
    return json({ ok: true, jobId: result.job!.id, existing: !!result.existing }, 202);
  } catch (error) {
    if (error instanceof PublishError) return json({ ok: false, error: error.message, issues: error.issues }, 422);
    throw error;
  }
}
