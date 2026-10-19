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

export type AdminSession = { userId: string; email: string; name: string; image?: string | null; role: "admin"; sessionId: string; createdAt: string };
export type CustomerSession = { userId: string; email: string; name: string; image?: string | null; role: "customer"; sessionId: string; createdAt: string };

async function sessionFrom<R extends "admin" | "customer">(h: Headers, role: R): Promise<(R extends "admin" ? AdminSession : CustomerSession) | null> {
  if (!dbConfigured()) return null;
  try {
    await ensureSchema();
    const s = await getAuth().api.getSession({ headers: h });
    if (!s) return null;
    const user = s.user as { role?: string; twoFactorEnabled?: boolean | null; image?: string | null };
    if (user.role !== role) return null;
    // Administrators continue to require the existing two-factor sign-in.
    if (role === "admin" && !user.twoFactorEnabled) return null;
    return {
      userId: s.user.id,
      email: s.user.email,
      name: s.user.name,
      image: user.image ?? null,
      role,
      sessionId: s.session.id,
      createdAt: new Date(s.session.createdAt).toISOString(),
    } as R extends "admin" ? AdminSession : CustomerSession;
  } catch (err) {
    console.error("[auth] Could not check the session:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** The signed-in admin for the page being rendered (checked once per render), or null. */
export const getAdminSession = cache(async () => sessionFrom(await headers(), "admin"));

/** A signed-in customer for the page being rendered (checked once per render), or null. */
export const getCustomerSession = cache(async () => sessionFrom(await headers(), "customer"));

/** Pages: the signed-in admin, or a redirect to the login page (coming back to `next` afterwards). */
export async function requireAdmin(next?: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(`/login/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return session;
}

/** Pages: a customer account, or redirect to sign-in. */
export async function requireCustomer(next = "/account/"): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect(`/login/?next=${encodeURIComponent(next)}`);
  return session;
}

/** Route handlers: the signed-in admin, or null (answer 401). */
export const adminSession = (req: Request) => sessionFrom(req.headers, "admin");

/** Route handlers: the signed-in customer, or null (answer 401). */
export const customerSession = (req: Request) => sessionFrom(req.headers, "customer");

/** Where to go after signing in: only an /admin/ path of this site. */
export function safeNext(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "/admin/";
  if (!value.startsWith("/admin/") || value.startsWith("//") || /[\\:]|\/\.\.?(\/|$)/.test(value)) return "/admin/";
  return value;
}
