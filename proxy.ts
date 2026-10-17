import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page and API request (Next.js 16 "proxy", formerly middleware). It only shapes URLs
 * and does an optimistic admin check; it never reads the database and imports nothing from src/server.
 *
 *  - /admin/* without a session cookie goes to the login page (a convenience: pages check again).
 *  - PERSONA_ROUTING=prefix: "/biodata/..." (PERSONA_PREFIXES="marriage=/biodata") is served as "/..."
 *    with the x-persona and x-persona-base request headers, so every page and API knows its persona.
 *  - "/bn/..." is served as "/..." with x-lang: bn (the Bangla version of a page).
 *  - "?print=<token>" becomes the x-print-token header (the server printing a document as a PDF).
 *  - Visitors can never send these headers themselves: incoming copies are always removed.
 */

const OWN_HEADERS = [
  "x-persona",
  "x-persona-base",
  "x-lang",
  "x-print-token",
] as const;

let parsed: { key: string; list: [prefix: string, slug: string][] } | undefined;
/** PERSONA_PREFIXES as [prefix, slug] pairs, longest prefix first (only in prefix mode). */
function prefixes(): [string, string][] {
  if ((process.env.PERSONA_ROUTING ?? "").trim().toLowerCase() !== "prefix")
    return [];
  const key = process.env.PERSONA_PREFIXES ?? "";
  if (parsed?.key === key) return parsed.list;
  const list: [string, string][] = [];
  for (const part of key.split(/[;,]/)) {
    const [slug, prefix] = part.split("=").map((x) => x?.trim().toLowerCase());
    if (
      slug &&
      /^[a-z][a-z0-9-]{1,31}$/.test(slug) &&
      prefix &&
      /^\/[a-z0-9-]+$/.test(prefix) &&
      prefix !== "/bn" &&
      prefix !== "/api" &&
      prefix !== "/admin"
    )
      list.push([prefix, slug]);
  }
  list.sort((a, b) => b[0].length - a[0].length);
  parsed = { key, list };
  return list;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (/^\/admin\/login(\/|$)/.test(pathname)) return NextResponse.next();
    if (!getSessionCookie(req, { cookiePrefix: "fb" })) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login/";
      url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const headers = new Headers(req.headers);
  const forged = OWN_HEADERS.some((h) => headers.has(h));
  for (const h of OWN_HEADERS) headers.delete(h);

  let path = pathname;
  let changed = forged;
  for (const [prefix, slug] of prefixes()) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length) || "/";
      headers.set("x-persona", slug);
      headers.set("x-persona-base", prefix);
      break;
    }
  }
  if (path === "/bn" || path.startsWith("/bn/")) {
    path = path.slice(3) || "/";
    headers.set("x-lang", "bn");
  }
  // The server's own Chrome printing a document (src/server/persona/pdf.ts); the token is checked there.
  const print = req.nextUrl.searchParams.get("print");
  if (print && print.length < 600) {
    headers.set("x-print-token", print);
    changed = true;
  }

  if (path !== pathname) {
    const url = req.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return changed
    ? NextResponse.next({ request: { headers } })
    : NextResponse.next();
}

export const config = {
  // Everything except build assets and plain files from public/ (those never depend on the persona).
  matcher: [
    "/((?!_next/static|_next/image|images/|fonts/|icon\\.svg|favicon\\.ico|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?)$).*)",
  ],
};
