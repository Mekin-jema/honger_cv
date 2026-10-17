import "server-only";
import { createHash } from "node:crypto";
import { LABEL_DEFAULTS, isLabelKey, type Labels } from "@/lib/persona/labels";
import type { BlockRef, Item, PersonaDoc, QuestionDoc, Section, Visibility } from "@/lib/persona/schema";
import { fill, lt } from "@/lib/persona/text";
import type { Block, ClientItem, ClientPersona, ClientSection, Lang, Question, Tier } from "@/lib/persona/types";

/**
 * A persona ready to serve: the validated document plus lookups. Built once per published version and
 * kept in memory (src/server/persona/cache.ts). `doc` still holds private items, so a CompiledPersona
 * never leaves the server; the browser gets `clientView()`, already filtered to the visitor's tier.
 */
export type CompiledPersona = {
  slug: string;
  /** persona_versions.id; null when built from the code content. */
  versionId: string | null;
  /** Published version number; 0 for the code content. */
  number: number;
  publishedAt: string;
  /** sha256 of the canonical document. */
  hash: string;
  /** The version's generated PDF (relative to DOCS_DIR), if one was made. */
  pdfPath: string | null;
  doc: PersonaDoc;
  questionsById: Map<string, QuestionDoc>;
  sectionsByKey: Map<string, Section>;
};

/** JSON with sorted keys, so the same document always hashes the same. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

export const docHash = (doc: PersonaDoc) => createHash("sha256").update(canonicalJson(doc)).digest("hex");

export function compilePersona(slug: string, doc: PersonaDoc, meta: { versionId?: string | null; number?: number; publishedAt?: string; pdfPath?: string | null } = {}): CompiledPersona {
  return {
    slug,
    versionId: meta.versionId ?? null,
    number: meta.number ?? 0,
    publishedAt: meta.publishedAt ?? new Date(0).toISOString(),
    hash: docHash(doc),
    pdfPath: meta.pdfPath ?? null,
    doc,
    questionsById: new Map(doc.questions.map((q) => [q.id, q])),
    sectionsByKey: new Map(doc.sections.map((s) => [s.key, s])),
  };
}

// ---------- visibility ----------

const RANK: Record<Visibility, number> = { public: 0, unlocked: 1, private: 2 };
/** May a visitor at `tier` see something marked `v`? Private is never shown to visitors. */
export const visibleAt = (v: Visibility, tier: Tier) => v !== "private" && RANK[v] <= RANK[tier];

/** An item the owner hasn't filled in yet (a template placeholder) is ignored everywhere. */
export function hasContent(it: Item): boolean {
  const filled = (v: Item["value"]) => !!v && (typeof v === "string" ? v.trim() : v.en.trim() || v.bn?.trim());
  return !!(filled(it.value) || filled(it.text) || it.details?.length || it.sub?.length || it.tags?.length || it.src);
}

export const itemVisibility = (section: Section, item: Item): Visibility =>
  item.visibility && RANK[item.visibility] > RANK[section.visibility] ? item.visibility : section.visibility;

export function questionVisible(c: CompiledPersona, id: string, tier: Tier): boolean {
  const q = c.questionsById.get(id);
  return !!q && visibleAt(q.visibility, tier);
}

// ---------- the browser's view ----------

const clean = (line: string) => line.replace(/\^\d+/g, "");

function toBlock(c: CompiledPersona, b: BlockRef, tier: Tier): Block | null {
  if (b.kind !== "section") return b as Block;
  const s = c.sectionsByKey.get(b.key);
  return s && s.inChat && visibleAt(s.visibility, tier) ? { kind: "section", key: b.key } : null;
}

function toItem(it: Item, lang: Lang): ClientItem {
  const out: ClientItem = { id: it.id };
  if (it.label !== undefined) out.label = lt(it.label, lang);
  if (it.value !== undefined) out.value = lt(it.value, lang);
  if (it.text !== undefined) out.text = lt(it.text, lang);
  if (it.meta !== undefined) out.meta = lt(it.meta, lang);
  if (it.period) out.period = it.period;
  if (it.details?.length) out.details = it.details.map((d) => lt(d, lang));
  if (it.tags?.length) out.tags = it.tags;
  if (it.src) out.src = it.src;
  if (it.width) out.width = it.width;
  if (it.height) out.height = it.height;
  if (it.sub?.length) out.sub = it.sub.map((s) => ({ title: lt(s.title, lang), period: s.period, meta: s.meta === undefined ? undefined : lt(s.meta, lang), details: s.details.map((d) => lt(d, lang)) }));
  return out;
}

/** A section as a visitor at `tier` sees it: items they may not see are left out entirely. */
export function clientSection(s: Section, tier: Tier, lang: Lang): ClientSection {
  return {
    key: s.key,
    title: lt(s.title, lang),
    display: s.display,
    items: s.items.filter((it) => hasContent(it) && visibleAt(itemVisibility(s, it), tier)).map((it) => toItem(it, lang)),
  };
}

export function resolvedLabels(doc: PersonaDoc, lang: Lang): Labels {
  const labels: Labels = { ...LABEL_DEFAULTS[lang] };
  // An English-only override on a bilingual persona keeps the Bangla default on Bangla pages.
  const englishOnly = (v: unknown) => typeof v === "string" && lang === "bn" && doc.site.languages.includes("en");
  for (const [k, v] of Object.entries(doc.labels)) if (isLabelKey(k) && !englishOnly(v)) labels[k] = lt(v, lang) || labels[k];
  const vars = { name: doc.identity.name, shortName: doc.identity.shortName };
  for (const k of Object.keys(labels) as (keyof Labels)[]) labels[k] = fill(labels[k], vars);
  return labels;
}

/** The URL of the persona's PDF: a file in public/ for the code-built job persona, else the documents route. */
export const documentPdfPath = (doc: PersonaDoc) => (doc.legacy ? `/${doc.document.fileName}` : `/d/${doc.document.fileName}`);

/** May a visitor at `tier` open the persona's document (page and PDF)? */
export const documentOpen = (doc: PersonaDoc, tier: Tier) => !doc.document.gated || tier === "unlocked";

const views = new WeakMap<CompiledPersona, Map<string, ClientPersona>>();

/** What the browser gets for a visitor at `tier` reading in `lang` (memoised per compiled version). */
export function clientView(c: CompiledPersona, tier: Tier, lang: Lang): ClientPersona {
  const key = `${tier}:${lang}`;
  let byKey = views.get(c);
  if (!byKey) views.set(c, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;

  const { doc } = c;
  const visibleIds = new Set(doc.questions.filter((q) => visibleAt(q.visibility, tier)).map((q) => q.id));
  const ids = (list: string[]) => list.filter((id) => visibleIds.has(id));
  const blocks = (list: BlockRef[]) => list.map((b) => toBlock(c, b, tier)).filter((b): b is Block => !!b);

  const questions: Question[] = doc.questions
    .filter((q) => visibleIds.has(q.id))
    .map((q) => ({
      id: q.id,
      label: lt(q.label, lang),
      prompt: lt(q.prompt, lang),
      icon: q.icon,
      keywords: q.keywords,
      ...(q.primary ? { primary: true } : {}),
      ...(q.random ? { random: true } : {}),
      answers: q.answers.map((a) => lt(a, lang)),
      blocks: blocks(q.blocks),
      followUps: ids(q.followUps),
      ...(q.page ? { page: q.page } : {}),
    }));

  const fallback: Question = {
    id: "fallback",
    label: "Not sure",
    prompt: "",
    icon: "sparkles",
    keywords: [],
    answers: doc.fallback.answers.map((a) => lt(a, lang)),
    blocks: blocks(doc.fallback.blocks),
    followUps: [],
  };

  // Only the sections a card can show go to the browser (the AI reads the rest on the server).
  const shownKeys = new Set<string>();
  for (const q of [...questions, fallback]) for (const b of q.blocks) if (b.kind === "section") shownKeys.add(b.key);
  const sections = doc.sections.filter((s) => shownKeys.has(s.key)).map((s) => clientSection(s, tier, lang));

  const labels = resolvedLabels(doc, lang);
  const pools = doc.hero.pools.map((p) => ({ id: p.id, lines: p.lines.map((l) => lt(l, lang)), ...(p.firstPass === false ? { firstPass: false } : {}) }));
  const longest = pools.map((p) => p.lines.map(clean).reduce((a, b) => (b.length > a.length ? b : a), "")).join(" ");

  const view: ClientPersona = {
    slug: c.slug,
    lang,
    defaultLang: doc.site.defaultLang,
    languages: doc.site.languages,
    tier,
    version: c.number,
    identity: {
      name: doc.identity.name,
      shortName: doc.identity.shortName,
      ...(doc.identity.givenName ? { givenName: doc.identity.givenName } : {}),
      ...(doc.identity.familyName ? { familyName: doc.identity.familyName } : {}),
      initials: doc.identity.initials,
      role: doc.identity.role === undefined ? undefined : lt(doc.identity.role, lang),
      location: doc.identity.location === undefined ? undefined : lt(doc.identity.location, lang),
      email: doc.identity.email,
      phone: doc.identity.phone,
      links: doc.identity.links,
      avatar: doc.identity.avatar ? { src: doc.identity.avatar.src, alt: lt(doc.identity.avatar.alt, lang) } : undefined,
      photos: doc.identity.photos.filter((p) => visibleAt(p.visibility, tier)).map((p) => ({ src: p.src, width: p.width, height: p.height, alt: lt(p.alt, lang) })),
    },
    labels,
    hero: { staticIntro: lt(doc.hero.staticIntro, lang), pools, schedule: doc.hero.schedule, longest },
    questions,
    fallback,
    landing: ids(doc.landing),
    sidebar: doc.sidebar.map((g) => ({ title: lt(g.title, lang), ids: ids(g.questionIds), icons: g.icons })).filter((g) => g.ids.length),
    defaultFollowUps: ids(doc.defaultFollowUps),
    sections,
    document: {
      label: labels.documentButton,
      download: labels.documentDownload,
      fileName: doc.document.fileName,
      // The PDF link only when there is one this visitor may download (else the button opens the page).
      pdfUrl: (doc.legacy || c.pdfPath) && documentOpen(doc, tier) ? documentPdfPath(doc) : undefined,
      pageUrl: `/${doc.document.slug}/`,
      language: doc.document.language,
      updated: doc.document.updated,
      gated: doc.document.gated,
      open: documentOpen(doc, tier),
    },
    access: {
      mode: doc.access.mode,
      hint: doc.access.codeHint === undefined ? undefined : lt(doc.access.codeHint, lang),
      requestIntro: doc.access.requestIntro === undefined ? undefined : lt(doc.access.requestIntro, lang),
      gatedTitles: tier === "public" ? doc.sections.filter((s) => s.visibility === "unlocked" && s.inChat).map((s) => lt(s.title, lang)) : [],
    },
    availability: { show: doc.availability.show, action: doc.availability.action && visibleIds.has(doc.availability.action) ? doc.availability.action : undefined },
    legacy: doc.legacy,
  };
  byKey.set(key, view);
  return view;
}
