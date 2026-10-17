import "server-only";
import type { Metadata } from "next";
import type { Lang } from "@/lib/persona/types";
import { siteUrl } from "@/lib/site";
import { trustedHops } from "../http";
import { requestHost, routingMode, type ResolvedPersona } from "./resolve";

/**
 * Absolute URLs of a persona's pages, for canonical links, hreflang, sitemaps and JSON-LD. The origin is
 * the persona's own address (site.url) when set; with host routing, the host it was reached on; else
 * the main site's address.
 */
export function personaOrigin(p: ResolvedPersona, h: Headers): string {
  const own = p.compiled.doc.site.url?.replace(/\/+$/, "");
  if (own) return own;
  if (routingMode() === "host" && !p.compiled.doc.legacy) {
    const host = requestHost(h);
    const proto = (trustedHops() ? h.get("x-forwarded-proto")?.split(",")[0]?.trim() : undefined) ?? (siteUrl.startsWith("https:") ? "https" : "http");
    if (host && /^[a-z0-9.-]+(:\d+)?$/.test(host)) return `${proto}://${host}`;
  }
  return siteUrl.replace(/\/+$/, "");
}

const basePath = () => process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The URL of `path` ("/family/") of this persona, in `lang` (Bangla pages live under /bn/). */
export function personaUrl(p: ResolvedPersona, h: Headers, path: string, lang: Lang = p.lang): string {
  const { defaultLang } = p.compiled.doc.site;
  const prefix = lang === "bn" && defaultLang !== "bn" ? "/bn" : "";
  return `${personaOrigin(p, h)}${basePath()}${p.base}${prefix}${path}`;
}

/** canonical + hreflang alternates for `path` (both languages when the persona has them). */
export function personaAlternates(p: ResolvedPersona, h: Headers, path: string): NonNullable<Metadata["alternates"]> {
  const { languages, defaultLang } = p.compiled.doc.site;
  if (languages.length < 2) return { canonical: personaUrl(p, h, path) };
  return {
    canonical: personaUrl(p, h, path),
    languages: Object.fromEntries([...languages.map((l) => [l === "bn" ? "bn-BD" : "en", personaUrl(p, h, path, l)]), ["x-default", personaUrl(p, h, path, defaultLang)]]),
  };
}
