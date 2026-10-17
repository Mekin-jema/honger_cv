import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { lt } from "@/lib/persona/text";
import { describe } from "@/lib/seo";
import { clientSection, documentOpen, hasContent, resolvedLabels } from "./compile";
import type { ResolvedPersona } from "./resolve";
import { personaAlternates, personaOrigin, personaUrl } from "./urls";

/**
 * The public, indexable pages of a persona that isn't the code-built job one: one per public section
 * marked "its own page", plus the document page (/biodata/). Gated parts never appear on them.
 */

export type SitePage = { key: string; path: string; title: string; kind: "section" | "document" };

export function sitePages(p: ResolvedPersona): SitePage[] {
  const { doc } = p.compiled;
  const out: SitePage[] = doc.sections
    .filter((s) => s.inSite && s.visibility === "public" && s.items.some((it) => hasContent(it) && (!it.visibility || it.visibility === "public")))
    .map((s) => ({ key: s.key, path: `/${s.key}/`, title: lt(s.title, p.lang), kind: "section" as const }));
  if (doc.document.sections.length) out.push({ key: doc.document.slug, path: `/${doc.document.slug}/`, title: lt(doc.document.title, p.lang), kind: "document" });
  return out;
}

/** The section shown at /<key>/, with only what this visitor may see (null: no such page). */
export function sectionPage(p: ResolvedPersona, key: string) {
  const s = p.compiled.doc.sections.find((x) => x.key === key && x.inSite && x.visibility === "public");
  if (!s) return null;
  const section = clientSection(s, p.tier, p.lang);
  return section.items.length ? { raw: s, section } : null;
}

/** A link inside this persona's site (persona prefix and the /bn/ prefix of Bangla pages). */
export function personaPath(p: ResolvedPersona, path: string) {
  const prefix = p.lang === "bn" && p.compiled.doc.site.defaultLang !== "bn" ? "/bn" : "";
  return `${p.base}${prefix}${path}`;
}

/** Metadata of a section or document page. */
export async function personaPageMetadata(p: ResolvedPersona, key: string): Promise<Metadata> {
  const h = await headers();
  const { doc } = p.compiled;
  const name = doc.identity.name;
  const labels = resolvedLabels(doc, p.lang);
  if (key === doc.document.slug) {
    const title = lt(doc.document.title, p.lang) || labels.documentButton;
    const open = documentOpen(doc, p.tier);
    return {
      title,
      description: describe(lt(doc.site.description, p.lang) || lt(doc.identity.summary, p.lang) || `${title} - ${name}`),
      alternates: personaAlternates(p, h, `/${key}/`),
      // A gated document has nothing for search engines; an open one is a real page.
      robots: doc.site.indexable && !doc.document.gated && open ? undefined : { index: false, follow: true },
    };
  }
  const page = sectionPage(p, key);
  if (!page) return {};
  const first = page.section.items.map((it) => it.text ?? (it.label && it.value ? `${it.label}: ${it.value}` : it.value) ?? "").join(" ");
  const title = page.section.title;
  const description = describe(first || `${title} - ${name}`);
  const url = personaUrl(p, h, `/${key}/`);
  return {
    title,
    description,
    alternates: personaAlternates(p, h, `/${key}/`),
    openGraph: { type: "profile", siteName: name, title: `${title} - ${name}`, description, url, locale: p.lang === "bn" ? "bn_BD" : "en_US" },
    ...(doc.site.indexable ? {} : { robots: { index: false, follow: false } }),
  };
}

/** schema.org Person for a persona: public facts only (never birth date, address or phone). */
export function personaPersonLd(p: ResolvedPersona, h: Headers) {
  const { doc } = p.compiled;
  const id = doc.identity;
  const origin = personaOrigin(p, h);
  return {
    "@type": "Person",
    "@id": `${origin}/#person`,
    name: id.name,
    ...(id.alternateNames.length ? { alternateName: id.alternateNames } : {}),
    ...(id.givenName ? { givenName: id.givenName } : {}),
    ...(id.familyName ? { familyName: id.familyName } : {}),
    ...(id.role ? { jobTitle: lt(id.role, "en") } : {}),
    ...(id.location ? { homeLocation: { "@type": "Place", name: lt(id.location, "en") } } : {}),
    ...(doc.site.description || id.summary ? { description: describe(lt(doc.site.description, "en") || lt(id.summary, "en"), 300) } : {}),
    knowsLanguage: doc.site.languages.map((l) => (l === "bn" ? "bn" : "en")),
    url: personaUrl(p, h, "/"),
    ...(id.links.length ? { sameAs: id.links.map((l) => l.href) } : {}),
  };
}
