import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { photos } from "@/content/photos";
import { projects } from "@/content/projects";
import { CONTENT_UPDATED, SITE_PAGES } from "@/lib/seo";
import { absoluteUrl as url } from "@/lib/site";
import { sitePages } from "@/server/persona/pages";
import { currentPersona, type ResolvedPersona } from "@/server/persona/resolve";
import { personaUrl } from "@/server/persona/urls";

/**
 * Only indexable pages: the chat home, the content pages, every project case study and the CV.
 * The /ask/* chat views are noindex (their content lives on these pages), so they are left out.
 * Other personas list their home, their section pages and (when open to everyone) their document,
 * with the Bangla version of each as an alternate.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const p = await currentPersona();
  if (!p.compiled.doc.legacy) return personaSitemap(p, await headers());
  const lastModified = CONTENT_UPDATED;
  const photo = url(photos[0].src);
  return [
    { url: url("/"), lastModified, changeFrequency: "monthly", priority: 1, images: [photo] },
    ...SITE_PAGES.map((p) => ({
      url: url(p.path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: p.path === "/about/" || p.path === "/projects/" ? 0.9 : 0.8,
      ...(p.path === "/about/" ? { images: [photo] } : {}),
    })),
    ...projects.map((p) => ({
      url: url(`/projects/${p.id}/`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [url(`/og/${p.id}.png`)],
    })),
    { url: url("/cv/"), lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}

function personaSitemap(p: ResolvedPersona, h: Headers): MetadataRoute.Sitemap {
  const { doc } = p.compiled;
  if (!doc.site.indexable) return [];
  const lastModified = new Date(p.compiled.publishedAt);
  const langs = doc.site.languages.length > 1 && doc.site.defaultLang === "en" ? doc.site.languages : null;
  const entry = (path: string, priority: number) => ({
    url: personaUrl(p, h, path, doc.site.defaultLang),
    lastModified,
    changeFrequency: "monthly" as const,
    priority,
    ...(langs ? { alternates: { languages: Object.fromEntries(langs.map((l) => [l === "bn" ? "bn-BD" : "en", personaUrl(p, h, path, l)])) } } : {}),
  });
  const pages = sitePages({ ...p, tier: "public" }).filter((x) => x.kind === "section" || !doc.document.gated);
  return [entry("/", 1), ...pages.map((x) => entry(x.path, x.kind === "document" ? 0.6 : 0.8))];
}
