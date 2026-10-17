// Shapes shared by the server (compiler, API routes) and the browser (chat UI). Everything the browser
// gets is already resolved to one language and filtered to what the visitor may see.

export type Lang = "en" | "bn";
/** What a visitor may see: everything public, or also the "unlocked" items (after an access code). */
export type Tier = "public" | "unlocked";

/**
 * Cards an answer can show. The "legacy" kinds render the job persona's hand-built components (they read
 * src/content); "section" renders any persona's own knowledge section by its display type.
 */
export type Block =
  | { kind: "stats" }
  | { kind: "focus" }
  | { kind: "beliefs" }
  | { kind: "privacy" }
  | { kind: "experience" }
  | { kind: "projects" }
  | { kind: "project"; id: string }
  | { kind: "skills" }
  | { kind: "cloud" }
  | { kind: "education" }
  | { kind: "languages" }
  | { kind: "contact" }
  | { kind: "hire" }
  | { kind: "download" }
  | { kind: "quotes" }
  | { kind: "stack" }
  | { kind: "suggest" }
  | { kind: "contact-form" }
  | { kind: "feedback-form" }
  | { kind: "section"; key: string }
  | { kind: "request-access" };

/** Cards that only exist for a persona built on the code content (the job persona). */
export const LEGACY_BLOCKS = [
  "stats",
  "focus",
  "beliefs",
  "experience",
  "projects",
  "project",
  "skills",
  "cloud",
  "education",
  "languages",
  "contact",
  "hire",
  "quotes",
  "stack",
] as const;
/** Cards any persona may use. */
export const SHARED_BLOCKS = [
  "privacy",
  "download",
  "suggest",
  "contact-form",
  "feedback-form",
  "section",
  "request-access",
] as const;

/** A ready-made question as the browser sees it: text already in the page's language. */
export type Question = {
  id: string;
  label: string;
  prompt: string;
  /** A name from src/lib/persona/icons.tsx. */
  icon: string;
  keywords: string[];
  /** Shown on the landing screen and first in the sidebar. */
  primary?: boolean;
  /** Starts on a random wording ("Surprise me"). */
  random?: boolean;
  /** Alternative wordings; "Regenerate" cycles through them. */
  answers: string[];
  blocks: Block[];
  followUps: string[];
  /** The indexable page that covers this topic, if there is one. */
  page?: string;
};

/** One item of a knowledge section, as a card shows it. */
export type ClientItem = {
  id: string;
  label?: string;
  value?: string;
  text?: string;
  meta?: string;
  period?: string;
  details?: string[];
  tags?: string[];
  src?: string;
  width?: number;
  height?: number;
  sub?: { title: string; period?: string; meta?: string; details: string[] }[];
};

export type SectionDisplay =
  | "facts"
  | "paragraphs"
  | "list"
  | "timeline"
  | "tags"
  | "gallery"
  | "quotes";

export type ClientSection = {
  key: string;
  title: string;
  display: SectionDisplay;
  items: ClientItem[];
};

export type ClientPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type ClientLink = { kind: string; label: string; href: string };

/** Everything the chat shell needs about the persona it is showing. Serialisable (sent from the server). */
export type ClientPersona = {
  slug: string;
  lang: Lang;
  defaultLang: Lang;
  languages: Lang[];
  tier: Tier;
  /** Published version number (0 = built from the code content). */
  version: number;
  identity: {
    name: string;
    shortName: string;
    givenName?: string;
    familyName?: string;
    initials: string;
    role?: string;
    location?: string;
    email?: string;
    phone?: string;
    links: ClientLink[];
    avatar?: { src: string; alt: string };
    photos: ClientPhoto[];
  };
  labels: Record<string, string>;
  hero: {
    staticIntro: string;
    pools: { id: string; lines: string[]; firstPass?: boolean }[];
    schedule: string[];
    longest: string;
  };
  questions: Question[];
  /** The answer when nothing fits. */
  fallback: Question;
  landing: string[];
  sidebar: { title: string; ids: string[]; icons: boolean }[];
  /** Follow-ups when an answer has none of its own. */
  defaultFollowUps: string[];
  /** Knowledge sections the visitor may see in chat cards. */
  sections: ClientSection[];
  document: {
    label: string;
    download: string;
    fileName: string;
    /** Only when a PDF exists and this visitor may download it. */
    pdfUrl?: string;
    pageUrl: string;
    language: string;
    updated?: string;
    /** Only visitors with an access code may open it. */
    gated: boolean;
    /** This visitor may open it. */
    open: boolean;
  };
  access: {
    mode: "open" | "code" | "request";
    hint?: string;
    requestIntro?: string;
    gatedTitles: string[];
  };
  availability: { show: boolean; action?: string };
  /** The job persona's hand-built cards (they read src/content). */
  legacy: boolean;
};
