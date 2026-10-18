"use client";

import { withBase } from "@/lib/utils";

export type ApiOk<T> = { ok: true; status: number; data: T };
export type ApiFail = { ok: false; status: number; error: string; data: Record<string, unknown> };
export type StudioMode = "admin" | "customer";

/**
 * JSON calls to the admin API. A 401 (session expired or revoked) sends the admin to the login page and
 * back; other failures come back as { ok: false, error } with the server's message.
 */
export async function adminFetch<T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<ApiOk<T> | ApiFail> {
  const hasBody = opts.body !== undefined;
  let res: Response;
  try {
    res = await fetch(withBase(path), {
      method: opts.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "content-type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch {
    return { ok: false, status: 0, error: "Can't reach the server. Check your connection and try again.", data: {} };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) {
    const back = `${window.location.pathname}${window.location.search}`;
    window.location.assign(withBase(`/admin/login/?next=${encodeURIComponent(back)}`));
  }
  if (!res.ok || data.ok === false) return { ok: false, status: res.status, error: typeof data.error === "string" ? data.error : `Something went wrong (${res.status}).`, data };
  return { ok: true, status: res.status, data: data as T };
}

function customerStudioPath(slug: string, path: string) {
  const adminPersona = `/api/admin/personas/${slug}/`;
  if (path.startsWith(adminPersona)) return `/api/account/personas/${slug}/studio/${path.slice(adminPersona.length)}`;
  if (path === "/api/admin/ai/") return `/api/account/personas/${slug}/studio/ai/`;
  const job = path.match(/^\/api\/admin\/jobs\/([^/]+)\/$/);
  if (job) return `/api/account/jobs/${job[1]}/`;
  return path;
}

/** Fetches through the correct role-scoped editor API. Customer 401s return to customer sign-in. */
export async function studioFetch<T = Record<string, unknown>>(
  mode: StudioMode,
  slug: string,
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiOk<T> | ApiFail> {
  if (mode === "admin") return adminFetch<T>(path, opts);
  const hasBody = opts.body !== undefined;
  let res: Response;
  try {
    res = await fetch(withBase(customerStudioPath(slug, path)), {
      method: opts.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "content-type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch {
    return { ok: false, status: 0, error: "Can't reach the server. Check your connection and try again.", data: {} };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) window.location.assign(withBase(`/login/?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`));
  if (!res.ok || data.ok === false) return { ok: false, status: res.status, error: typeof data.error === "string" ? data.error : `Something went wrong (${res.status}).`, data };
  return { ok: true, status: res.status, data: data as T };
}

/** Saves text as a file in the browser. */
export function downloadText(name: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
