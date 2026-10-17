import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";
import { dbConfigured, ensureSchema } from "./db";

/**
 * Who is signed in to the admin. Every admin page, server function and /api/admin/* handler checks
 * this itself (src/proxy.ts only redirects visitors without a session cookie, as a convenience).
 */

export type AdminSession = { userId: string; email: string; name: string; sessionId: string; createdAt: string };

async function sessionFrom(h: Headers): Promise<AdminSession | null> {
  if (!dbConfigured()) return null;
  try {
    await ensureSchema();
    const s = await getAuth().api.getSession({ headers: h });
    // Fail closed: an account without two-factor sign-in never counts as signed in.
    if (!s || !(s.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled) return null;
    return { userId: s.user.id, email: s.user.email, name: s.user.name, sessionId: s.session.id, createdAt: new Date(s.session.createdAt).toISOString() };
  } catch (err) {
    console.error("[admin] Could not check the session:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** The signed-in admin for the page being rendered (checked once per render), or null. */
export const getAdminSession = cache(async () => sessionFrom(await headers()));

/** Pages: the signed-in admin, or a redirect to the login page (coming back to `next` afterwards). */
export async function requireAdmin(next?: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(`/admin/login/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return session;
}

/** Route handlers: the signed-in admin, or null (answer 401). */
export const adminSession = (req: Request) => sessionFrom(req.headers);

/** Where to go after signing in: only an /admin/ path of this site. */
export function safeNext(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "/admin/";
  if (!value.startsWith("/admin/") || value.startsWith("//") || /[\\:]|\/\.\.?(\/|$)/.test(value)) return "/admin/";
  return value;
}
