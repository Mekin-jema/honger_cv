import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { absoluteUrl, basePath as base } from "@/lib/site";
import { currentPersona } from "@/server/persona/resolve";
import { personaOrigin } from "@/server/persona/urls";

// The private inbox isn't listed here on purpose (that would advertise it); it sends
// `X-Robots-Tag: noindex` and a noindex meta tag, and is a 404 without a session.
// Per persona: each host (or path prefix) gets its own rules and sitemap.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const p = await currentPersona();
  const { doc } = p.compiled;
  if (doc.legacy)
    return {
      rules: { userAgent: "*", allow: "/", disallow: `${base}/api/` },
      sitemap: absoluteUrl("/sitemap.xml"),
    };
  if (!doc.site.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  const root = `${base}${p.base}`;
  return {
    // Documents and unlock links are for people with a code; the chat views are noindex anyway.
    rules: { userAgent: "*", allow: `${root}/`, disallow: [`${root}/api/`, `${root}/d/`, `${root}/unlock/`] },
    sitemap: `${personaOrigin(p, await headers())}${root}/sitemap.xml`,
  };
}
