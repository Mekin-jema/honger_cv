import { z } from "zod";
import { ICON_NAMES } from "./icons";
import { LEGACY_BLOCKS } from "./types";

/**
 * A persona as it is edited and stored (persona_drafts.doc, persona_versions.doc). One schema for the
 * admin forms, the Markdown/AI import and the publish step, so all three agree on what is valid.
 * Every visible text may be English only, or { en, bn } for a Bangla version.
 */

export const LangSchema = z.enum(["en", "bn"]);
export const VisibilitySchema = z.enum(["public", "unlocked", "private"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

const Text = (max = 6000) => z.string().max(max);
export const LTextSchema = z.union([Text(), z.object({ en: Text(), bn: Text().optional() })]);

export const IdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Use lowercase letters, digits and dashes (max 64)");

const hostRe = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{2,5})?$/;

const LEGACY = new Set<string>(LEGACY_BLOCKS);
/** Paths the site itself uses: a section page or the document page can't take them. */
export const RESERVED_PATHS = new Set(["ask", "api", "admin", "unlock", "d", "bn", "en", "og", "_next", "images", "fonts", "sitemap-xml", "robots-txt"]);

export const BlockRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("section"), key: IdSchema }),
  z.object({ kind: z.literal("project"), id: IdSchema }),
  z.object({ kind: z.literal("request-access") }),
  z.object({ kind: z.literal("privacy") }),
  z.object({ kind: z.literal("download") }),
  z.object({ kind: z.literal("suggest") }),
  z.object({ kind: z.literal("contact-form") }),
  z.object({ kind: z.literal("feedback-form") }),
  z.object({ kind: z.literal("stats") }),
  z.object({ kind: z.literal("focus") }),
  z.object({ kind: z.literal("beliefs") }),
  z.object({ kind: z.literal("experience") }),
  z.object({ kind: z.literal("projects") }),
  z.object({ kind: z.literal("skills") }),
  z.object({ kind: z.literal("cloud") }),
  z.object({ kind: z.literal("education") }),
  z.object({ kind: z.literal("languages") }),
  z.object({ kind: z.literal("contact") }),
  z.object({ kind: z.literal("hire") }),
  z.object({ kind: z.literal("quotes") }),
  z.object({ kind: z.literal("stack") }),
]);
export type BlockRef = z.infer<typeof BlockRefSchema>;

export const SECTION_DISPLAYS = ["facts", "paragraphs", "list", "timeline", "tags", "gallery", "quotes"] as const;

export const ItemSchema = z.object({
  id: IdSchema,
  /** facts: the field name ("Height"); timeline: the title; quotes: who said it. */
  label: LTextSchema.optional(),
  /** facts: the value ("5'8\""). */
  value: LTextSchema.optional(),
  /** paragraphs/list/quotes: the text. */
  text: LTextSchema.optional(),
  /** timeline: organisation or place; quotes: their role. */
  meta: LTextSchema.optional(),
  period: z.string().max(80).optional(),
  details: z.array(LTextSchema).max(40).optional(),
  tags: z.array(z.string().max(80)).max(60).optional(),
  /** gallery: image path (a file under public/ or a document file). */
  src: z.string().max(400).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  /** timeline: nested entries (e.g. client engagements inside a job). */
  sub: z
    .array(z.object({ title: LTextSchema, period: z.string().max(80).optional(), meta: LTextSchema.optional(), details: z.array(LTextSchema).max(40).default([]) }))
    .max(20)
    .optional(),
  /** Stricter than the section's visibility (e.g. a phone number inside a public "Family" section). */
  visibility: VisibilitySchema.optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const SectionSchema = z.object({
  key: IdSchema,
  title: LTextSchema,
  display: z.enum(SECTION_DISPLAYS),
  visibility: VisibilitySchema,
  /** The AI may use it and answers may show it as a card. */
  inChat: z.boolean().default(true),
  /** Printed on the CV / biodata. */
  inDocument: z.boolean().default(true),
  /** Gets its own indexable page (public sections only). */
  inSite: z.boolean().default(false),
  items: z.array(ItemSchema).max(300).default([]),
});
export type Section = z.infer<typeof SectionSchema>;

export const QuestionSchema = z.object({
  id: IdSchema,
  label: LTextSchema,
  prompt: LTextSchema,
  icon: z.enum(ICON_NAMES as [string, ...string[]]).default("sparkles"),
  keywords: z.array(z.string().max(60)).max(80).default([]),
  primary: z.boolean().default(false),
  random: z.boolean().default(false),
  visibility: z.enum(["public", "unlocked"]).default("public"),
  answers: z.array(LTextSchema).min(1, "Add at least one answer").max(40),
  blocks: z.array(BlockRefSchema).max(4).default([]),
  followUps: z.array(IdSchema).max(4).default([]),
  page: z.string().max(200).optional(),
});
export type QuestionDoc = z.infer<typeof QuestionSchema>;

const PhotoSchema = z.object({
  src: z.string().min(1).max(400),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  alt: LTextSchema,
  visibility: VisibilitySchema.default("public"),
});

/** The document's shape and defaults, without the cross-checks (lenient parsing of unfinished drafts). */
export const PersonaDocShape = z.object({
  v: z.literal(1),
  /** Shown in the admin only ("Job", "Marriage"). */
  name: z.string().min(1).max(60),
  /** Uses the job persona's hand-built cards (they read src/content). */
  legacy: z.boolean().default(false),
  identity: z.object({
    name: z.string().min(1, "Add the full name").max(120),
    shortName: z.string().min(1, "Add a short name").max(60),
    initials: z.string().min(1, "Add initials").max(4),
    givenName: z.string().max(60).optional(),
    familyName: z.string().max(60).optional(),
    alternateNames: z.array(z.string().max(120)).max(10).default([]),
    role: LTextSchema.optional(),
    headline: LTextSchema.optional(),
    location: LTextSchema.optional(),
    summary: LTextSchema.optional(),
    email: z.string().max(200).optional(),
    phone: z.string().max(40).optional(),
    links: z
      .array(z.object({ kind: z.enum(["github", "linkedin", "website", "facebook", "instagram", "whatsapp", "x", "other"]), label: z.string().max(80), href: z.string().url("Use a full address starting with https://").max(400) }))
      .max(12)
      .default([]),
    avatar: z.object({ src: z.string().max(400), alt: LTextSchema }).optional(),
    photos: z.array(PhotoSchema).max(12).default([]),
  }),
  site: z
    .object({
      /** Canonical origin, e.g. https://biodata.example.com (default: NEXT_PUBLIC_SITE_URL). */
      url: z.string().url("Use a full address starting with https://").max(200).optional(),
      /** Host names that show this persona when PERSONA_ROUTING=host. */
      hosts: z.array(z.string().max(200).regex(hostRe, "A host name like biodata.example.com")).max(10).default([]),
      indexable: z.boolean().default(true),
      defaultLang: LangSchema.default("en"),
      languages: z.array(LangSchema).min(1).max(2).default(["en"]),
      title: LTextSchema.optional(),
      description: LTextSchema.optional(),
      keywords: z.array(z.string().max(80)).max(40).default([]),
    })
    .prefault({}),
  /** Overrides of the label catalog (src/lib/persona/labels.ts). */
  labels: z.record(z.string(), LTextSchema).default({}),
  hero: z.object({
    staticIntro: LTextSchema,
    pools: z.array(z.object({ id: IdSchema, lines: z.array(LTextSchema).min(1, "Add at least one line").max(24), firstPass: z.boolean().optional() })).max(6),
    schedule: z.array(IdSchema).max(32).default([]),
  }),
  sections: z.array(SectionSchema).max(60).default([]),
  questions: z.array(QuestionSchema).max(120).default([]),
  fallback: z
    .object({ answers: z.array(LTextSchema).min(1).max(6), blocks: z.array(BlockRefSchema).max(2).default([{ kind: "suggest" }]) })
    .prefault({ answers: ["That's outside what this chat covers. Try one of these:"] }),
  landing: z.array(IdSchema).max(6).default([]),
  sidebar: z.array(z.object({ title: LTextSchema, questionIds: z.array(IdSchema).max(80), icons: z.boolean().default(false) })).max(4).default([]),
  defaultFollowUps: z.array(IdSchema).max(4).default([]),
  availability: z.object({ show: z.boolean().default(false), action: IdSchema.optional() }).prefault({}),
  rules: z
    .object({
      voice: LTextSchema.default("Friendly, direct and concise, in the first person."),
      audience: LTextSchema.optional(),
      boundaries: z.array(LTextSchema).max(30).default([]),
      language: z.enum(["match", "en", "bn"]).default("match"),
      maxWords: z.number().int().min(30).max(250).default(90),
      extra: LTextSchema.optional(),
    })
    .prefault({}),
  document: z
    .object({
      kind: z.enum(["cv", "biodata"]).default("cv"),
      /** The web page path, e.g. "cv" -> /cv/. */
      slug: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/, "Lowercase letters, digits and dashes").default("cv"),
      fileName: z.string().regex(/^[A-Za-z0-9._-]+\.pdf$/, "Letters, digits, dots and dashes, ending in .pdf").default("document.pdf"),
      title: LTextSchema.default("Document"),
      language: z.string().max(40).default("English"),
      updated: z.string().max(40).optional(),
      showPhoto: z.boolean().default(true),
      /** Only visitors with an access code may open the page and the PDF. */
      gated: z.boolean().default(false),
      /** Sections printed on the document, in order. */
      sections: z.array(IdSchema).max(60).default([]),
      /** Template data for the job persona's hand-tuned CV (src/content/cv.ts shape). */
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .prefault({}),
  access: z
    .object({
      mode: z.enum(["open", "code", "request"]).default("open"),
      requestIntro: LTextSchema.optional(),
      codeHint: LTextSchema.optional(),
    })
    .prefault({}),
  checks: z
    .array(
      z.object({
        q: z.string().min(2, "Write the test question, or remove it").max(300),
        tier: z.enum(["public", "unlocked"]).default("public"),
        lang: LangSchema.default("en"),
        expect: z.object({
          route: z.enum(["topic", "answer", "gated", "decline"]).optional(),
          intentIdIn: z.array(IdSchema).max(10).optional(),
          mustInclude: z.array(z.string().max(200)).max(10).optional(),
          mustNotInclude: z.array(z.string().max(200)).max(10).optional(),
        }),
      }),
    )
    .max(100)
    .default([]),
});

export const PersonaDocSchema = PersonaDocShape.superRefine((doc, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  const qIds = new Set<string>();
  doc.questions.forEach((q, i) => {
    if (qIds.has(q.id)) issue(["questions", i, "id"], `Duplicate question id "${q.id}"`);
    qIds.add(q.id);
    if (q.id === "ai" || q.id === "fallback") issue(["questions", i, "id"], `"${q.id}" is reserved`);
  });
  const sections = new Map<string, Section>();
  doc.sections.forEach((s, i) => {
    if (sections.has(s.key)) issue(["sections", i, "key"], `Duplicate section key "${s.key}"`);
    sections.set(s.key, s);
    const itemIds = new Set<string>();
    s.items.forEach((it, j) => {
      if (itemIds.has(it.id)) issue(["sections", i, "items", j, "id"], `Duplicate item id "${it.id}" in "${s.key}"`);
      itemIds.add(it.id);
    });
    if (s.visibility === "private" && s.inChat) issue(["sections", i, "inChat"], "A private section can't be used in the chat");
    if (s.visibility !== "public" && s.inSite) issue(["sections", i, "inSite"], "Only public sections get a public page");
    if (s.inSite && RESERVED_PATHS.has(s.key)) issue(["sections", i, "key"], `"${s.key}" is a path the site already uses: give the section another key`);
  });

  const rank = { public: 0, unlocked: 1, private: 2 } as const;
  const checkRef = (path: (string | number)[], id: string) => {
    if (!qIds.has(id)) issue(path, `Unknown question "${id}"`);
  };
  const checkBlocks = (path: (string | number)[], blocks: BlockRef[], visibility: "public" | "unlocked") => {
    blocks.forEach((b, k) => {
      if (LEGACY.has(b.kind) && !doc.legacy) issue([...path, k], `The "${b.kind}" card only exists for the job persona`);
      if (b.kind !== "section") return;
      const s = sections.get(b.key);
      if (!s) return issue([...path, k, "key"], `Unknown section "${b.key}"`);
      if (!s.inChat) issue([...path, k, "key"], `Section "${b.key}" is not available in the chat`);
      if (rank[s.visibility] > rank[visibility]) issue([...path, k, "key"], `A ${visibility} answer can't show the ${s.visibility} section "${b.key}"`);
    });
  };
  doc.questions.forEach((q, i) => {
    q.followUps.forEach((f, k) => checkRef(["questions", i, "followUps", k], f));
    checkBlocks(["questions", i, "blocks"], q.blocks, q.visibility);
  });
  checkBlocks(["fallback", "blocks"], doc.fallback.blocks, "public");
  doc.landing.forEach((id, k) => checkRef(["landing", k], id));
  doc.defaultFollowUps.forEach((id, k) => checkRef(["defaultFollowUps", k], id));
  doc.sidebar.forEach((g, i) => g.questionIds.forEach((id, k) => checkRef(["sidebar", i, "questionIds", k], id)));
  if (doc.availability.action) checkRef(["availability", "action"], doc.availability.action);
  const poolIds = new Set(doc.hero.pools.map((p) => p.id));
  doc.hero.schedule.forEach((id, k) => {
    if (!poolIds.has(id)) issue(["hero", "schedule", k], `Unknown hero pool "${id}"`);
  });
  doc.document.sections.forEach((key, k) => {
    if (!sections.has(key)) issue(["document", "sections", k], `Unknown section "${key}"`);
    else if (sections.get(key)!.visibility === "private") issue(["document", "sections", k], `The private section "${key}" can't be printed`);
    else if (sections.get(key)!.visibility === "unlocked" && !doc.document.gated) issue(["document", "sections", k], `"${key}" is for unlocked visitors only: make the document gated, or leave it out`);
  });
  if (!doc.site.languages.includes(doc.site.defaultLang)) issue(["site", "defaultLang"], "The default language must be one of the languages");
  if (RESERVED_PATHS.has(doc.document.slug)) issue(["document", "slug"], `"${doc.document.slug}" is a path the site already uses`);
  if (!doc.legacy && doc.sections.some((x) => x.inSite && x.key === doc.document.slug)) issue(["document", "slug"], `A section page already uses /${doc.document.slug}/`);
});

/** A persona as stored (defaults filled in). */
export type PersonaDoc = z.infer<typeof PersonaDocSchema>;
/** A persona as written by hand or by the import (defaults optional). */
export type PersonaDocInput = z.input<typeof PersonaDocSchema>;

/** Readable one-line messages for the admin: "questions.3.followUps.0: Unknown question \"x\"". */
export function formatIssues(error: z.ZodError, max = 20): string[] {
  return error.issues.slice(0, max).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}
