import "server-only";
import { adminSession, type AdminSession } from "./admin-session";
import { bad, forbidden, sameOrigin } from "./http";

/**
 * The first line of every /api/admin/* handler: the signed-in admin, or the response to send instead
 * (401 without a session; 403 for a write from another site).
 */
export async function adminGuard(req: Request, opts: { write?: boolean } = {}): Promise<AdminSession | Response> {
  if (opts.write && !sameOrigin(req)) return forbidden();
  const session = await adminSession(req);
  return session ?? bad("Sign in first.", 401);
}

export const isResponse = (v: unknown): v is Response => v instanceof Response;

export const SLUG_RE = /^[a-z][a-z0-9-]{1,31}$/;
