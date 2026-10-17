import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";
import { dbConfigured, ensureSchema } from "@/server/db";
import { bad } from "@/server/http";

// The admin login's endpoints (sign-in, two-factor code, sign-out, sessions, password change), served by
// Better Auth. Its tables come from migrations/0004_better_auth.sql, applied before the first request.

/**
 * The site uses trailingSlash: true, so Next answers /api/auth/sign-in/email with a 308 to
 * /api/auth/sign-in/email/ (fetch follows it with the same method and body). Better Auth's routes have
 * no trailing slash, so it is removed again here.
 */
async function withoutTrailingSlash(req: Request): Promise<Request> {
  const url = new URL(req.url);
  if (!/.\/$/.test(url.pathname)) return req;
  url.pathname = url.pathname.replace(/\/+$/, "");
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return new Request(url, { method: req.method, headers: req.headers, body });
}

async function handle(req: Request): Promise<Response> {
  if (!dbConfigured()) return bad("Sign-in is not configured.", 503);
  try {
    await ensureSchema();
  } catch {
    return bad("Sign-in is unavailable right now.", 503);
  }
  const handler = toNextJsHandler(getAuth());
  const request = await withoutTrailingSlash(req);
  return request.method === "GET" ? handler.GET(request) : handler.POST(request);
}

export const GET = handle;
export const POST = handle;
