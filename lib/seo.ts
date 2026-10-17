// Search-engine helpers shared by the content pages, the chat links, metadata and structured data.
// Everything here is built from src/content, so the facts stay identical everywhere.
import type { Metadata } from "next";
import { experience } from "@/content/experience";
import { education, languages, skills } from "@/content/details";
import { photos } from "@/content/photos";
import { profile } from "@/content/profile";
import type { Project } from "@/content/projects";
import { absoluteUrl, siteUrl } from "./site";
import { plain } from "./utils";

/** Last meaningful content update, shown to search engines as lastModified. Bump when content changes. */
export const CONTENT_UPDATED = process.env.CONTENT_UPDATED || "2026-10-03";

// ---------- the indexable content pages ----------

export const SITE_PAGES = [
  { path: "/about/", label: "About" },
  { path: "/experience/", label: "Experience" },
  { path: "/projects/", label: "Projects" },
  { path: "/skills/", label: "Skills" },
  { path: "/contact/", label: "Contact" },
] as const;

/**
 * The content page that covers a chat topic. Chat links point here (crawlers follow the href; a normal
 * click still answers in the chat), so every topic has one indexable URL.
 */
export function pageFor(intentId: string): string | undefined {
  if (intentId.startsWith("project-")) return `/projects/${intentId.slice("project-".length)}/`;
  const map: Record<string, string> = {
    about: "/about/",
    beliefs: "/about/#beliefs",
    education: "/about/#education",
    languages: "/about/#languages",
    recommendations: "/about/#recommendations",
    experience: "/experience/",
    cro: "/experience/",
    now: "/projects/",
    projects: "/projects/",
    skills: "/skills/",
    cloud: "/skills/#cloud",
    contact: "/contact/",
    hire: "/contact/",
    message: "/contact/#message",
    download: "/cv/",
  };
  return map[intentId];
}

/** A search-result description: plain text, at most `max` characters, cut at a word boundary. */
export function describe(text: string, max = 155): string {
  const clean = plain(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.\-]+$/, "");
  return `${atWord}…`;
}

/** Title for a content page, e.g. "Projects - Md Maruf Billah, Lead Software Engineer" via the layout template. */
export const pageTitle = (topic: string) => `${topic}`;

// ---------- structured data (JSON-LD) ----------

export const PERSON_ID = `${siteUrl}/#person`;
export const WEBSITE_ID = `${siteUrl}/#website`;

const photoUrl = absoluteUrl(photos[0].src);

export function personLd() {
  const current = experience[0];
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: profile.name,
    alternateName: ["Maruf Billah", "Md. Maruf Billah", "MarufGPT", "maruf1020"],
    givenName: "Maruf",
    familyName: "Billah",
    jobTitle: profile.role,
    description: describe(profile.summary, 300),
    url: absoluteUrl("/"),
    image: { "@type": "ImageObject", url: photoUrl, width: photos[0].width, height: photos[0].height, caption: photos[0].alt },
    email: `mailto:${profile.email}`,
    telephone: profile.phone.replace(/\s+/g, ""),
    worksFor: { "@type": "Organization", name: current.company },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: education.school,
      sameAs: "https://en.wikipedia.org/wiki/North_South_University",
    },
    homeLocation: { "@type": "Place", name: "Dhaka, Bangladesh" },
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
    nationality: { "@type": "Country", name: "Bangladesh" },
    knowsLanguage: languages.map((l) => l.name),
    knowsAbout: [...new Set(skills.flatMap((g) => g.items).slice(0, 40))],
    sameAs: [profile.links.github, profile.links.linkedin],
  };
}

export function websiteLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    // Google shows the WebSite name as the site's name in results: the short brand of the domain.
    name: "MarufGPT",
    alternateName: [`${profile.name} - ${profile.role}`, "Maruf GPT", "marufgpt.com"],
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
  };
}

/** A page about the person (home, about): tells search engines the page's subject is the Person. */
export function profilePageLd(path: string, name: string) {
  return {
    "@type": "ProfilePage",
    "@id": `${absoluteUrl(path)}#page`,
    url: absoluteUrl(path),
    name,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
    dateModified: CONTENT_UPDATED,
  };
}

export function webPageLd(path: string, name: string, description: string) {
  return {
    "@type": "WebPage",
    "@id": `${absoluteUrl(path)}#page`,
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
    dateModified: CONTENT_UPDATED,
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
  };
}

export function projectLd(p: Project) {
  const isCode = p.link?.href.includes("github.com");
  return {
    "@type": isCode ? "SoftwareSourceCode" : "CreativeWork",
    "@id": `${absoluteUrl(`/projects/${p.id}/`)}#project`,
    name: p.name,
    headline: p.tagline,
    description: describe(`${p.tagline} ${p.problem}`, 300),
    url: absoluteUrl(`/projects/${p.id}/`),
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    keywords: p.stack.join(", "),
    image: absoluteUrl(`/og/${p.id}.png`),
    ...(isCode ? { codeRepository: p.link!.href, programmingLanguage: ["TypeScript", "JavaScript"] } : {}),
  };
}

/** Wraps nodes into one @graph script payload. */
export const graph = (...nodes: object[]) => JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });

// ---------- page metadata ----------


/** Title, description, canonical, Open Graph and Twitter for a content page (child objects replace the layout's). */
export function pageMetadata({ path, title, description, image }: { path: string; title: string; description: string; image?: string }): Metadata {
  const url = absoluteUrl(path);
  const img = image ?? "/og.png";
  const full = `${title} - ${profile.name}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", siteName: profile.name, title: full, description, url, images: [{ url: img, width: 1200, height: 630, alt: full }], firstName: "Maruf", lastName: "Billah" },
    twitter: { card: "summary_large_image", title: full, description, images: [img] },
  };
}
