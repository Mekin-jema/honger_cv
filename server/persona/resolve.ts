import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Lang, Tier } from "@/lib/persona/types";
import { trustedHops } from "../http";
import { codeSnapshot, DEFAULT_PERSONA, getPersona, hostMap } from "./cache";
import type { CompiledPersona } from "./compile";

/**
 * Which persona a request is for. Decided by deploy-time settings only (no code change when hosting
 * is decided):
 *
 *   PERSONA_ROUTING=single (default)  every request shows DEFAULT_PERSONA (default "job")
 *   PERSONA_ROUTING=host              the request's host name, via PERSONA_HOSTS and the persona's
 *                                     site settings ("job=maruf.dev;marriage=biodata.example.com")
 *   PERSONA_ROUTING=prefix            a path prefix ("marriage=/biodata"), stripped by src/proxy.ts
 *                                     into the x-persona header
 *
 * Unknown hosts, unknown personas and personas with nothing published fall back to the default.
 * An admin's preview cookie (src/server/persona/preview.ts) wins over all of them: that browser sees
 * the persona's draft instead.
 */

export type ResolvedPersona = {
  slug: string;
  compiled: CompiledPersona;
  /** What this visitor may see. */
  tier: Tier;
  lang: Lang;
  /** "/biodata" in prefix mode; "" otherwise. Prepended to every link of this persona. */
  base: string;
  /** Bumped by "log everyone out": unlock cookies from an older epoch stop working. */
  accessEpoch: number;
  /** Set while the admin previews a draft: the page says so, and nothing the request does is recorded. */
  preview: { invalid?: boolean } | null;
  /** A /bn/ page was asked for, but this persona has no Bangla: pages answer 404. */
  wrongLang: boolean;
};

type Mode = "single" | "host" | "prefix";
export const routingMode = (): Mode => {
  const m = process.env.PERSONA_ROUTING?.trim().toLowerCase();
  return m === "host" || m === "prefix" ? m : "single";
};

const SLUG = /^[a-z][a-z0-9-]{1,31}$/;

/** The host the visitor typed (behind a trusted proxy, X-Forwarded-Host), lower-case, with any port. */
export function requestHost(h: Headers): string {
  const forwarded = trustedHops()
    ? h.get("x-forwarded-host")?.split(",")[0]?.trim()
    : undefined;
  return (forwarded || h.get("host") || "").toLowerCase();
}

async function pickSlug(h: Headers): Promise<{ slug: string; base: string }> {
  const mode = routingMode();
  if (mode === "prefix") {
    // Set (and any visitor-sent copy removed) by src/proxy.ts on every page and API request.
    const slug = h.get("x-persona")?.trim() ?? "";
    const base = h.get("x-persona-base")?.trim() ?? "";
    if (SLUG.test(slug) && /^(\/[a-z0-9-]+)?$/.test(base))
      return { slug, base };
  }
  if (mode === "host") {
    const host = requestHost(h);
    const map = await hostMap();
    const slug = map.get(host) ?? map.get(host.replace(/:\d+$/, ""));
    if (slug && SLUG.test(slug)) return { slug, base: "" };
  }
  return { slug: DEFAULT_PERSONA(), base: "" };
}

const wrongLang = (h: Headers, compiled: CompiledPersona) =>
  h.get("x-lang") === "bn" &&
  (!compiled.doc.site.languages.includes("bn") ||
    compiled.doc.site.defaultLang === "bn");

/** The persona's language for this request: /bn/ pages ask for Bangla (x-lang, set by the proxy). */
function pickLang(h: Headers, compiled: CompiledPersona): Lang {
  const want = h.get("x-lang");
  const { languages, defaultLang } = compiled.doc.site;
  return (want === "en" || want === "bn") && languages.includes(want)
    ? want
    : defaultLang;
}

async function resolve(
  h: Headers,
  cookie: (name: string) => string | undefined,
): Promise<ResolvedPersona> {
  const printing = h.get("x-print-token")
    ? await printRequest(h.get("x-print-token"))
    : null;
  if (printing)
    return {
      ...printing,
      lang: printing.compiled.doc.site.defaultLang,
      base: "",
      preview: null,
      wrongLang: false,
    };
  const wanted = cookie("pv") ? await previewRequest(h, cookie("pv")) : null;
  if (wanted && "compiled" in wanted) {
    const { compiled, tier } = wanted;
    return {
      slug: compiled.slug,
      compiled,
      tier,
      lang: pickLang(h, compiled),
      base: "",
      accessEpoch: 0,
      preview: {},
      wrongLang: wrongLang(h, compiled),
    };
  }
  const { slug, base } = wanted
    ? { slug: wanted.slug, base: "" }
    : await pickSlug(h);
  let found = await getPersona(slug);
  let resolvedBase = base;
  if (!found && slug !== DEFAULT_PERSONA()) {
    found = await getPersona(DEFAULT_PERSONA());
    resolvedBase = "";
  }
  const compiled = found?.compiled ?? codeSnapshot("job")!;
  const accessEpoch = found?.accessEpoch ?? 0;
  const tier = await tierFor(compiled, accessEpoch, found?.revoked, cookie);
  return {
    slug: compiled.slug,
    compiled,
    tier,
    lang: pickLang(h, compiled),
    base: resolvedBase,
    accessEpoch,
    preview: wanted ? { invalid: true } : null,
    wrongLang: wrongLang(h, compiled),
  };
}

/**
 * The draft an admin's preview cookie asks for. `{ slug }` alone when the draft can't be shown (it has
 * problems): the live version of that persona is shown with a notice. null for everyone else.
 */
async function previewRequest(
  h: Headers,
  value: string | undefined,
): Promise<
  { compiled: CompiledPersona; tier: Tier } | { slug: string } | null
> {
  const { readPreview, previewPersona } = await import("./preview");
  const want = readPreview(value);
  if (!want) return null;
  const draft = await previewPersona(want.slug, h);
  if (!draft) return null;
  return "compiled" in draft
    ? { compiled: draft.compiled, tier: want.tier }
    : { slug: want.slug };
}

/** The server's own Chrome printing a document: the live version, as a visitor with an access code. */
async function printRequest(token: string | null) {
  const { readPrintToken } = await import("./pdf");
  const t = readPrintToken(token);
  if (!t) return null;
  const found = await getPersona(t.slug);
  if (!found || found.compiled.versionId !== t.versionId) return null;
  return {
    slug: t.slug,
    compiled: found.compiled,
    tier: "unlocked" as const,
    accessEpoch: found.accessEpoch,
  };
}

/** Unlocked when the visitor holds a valid access cookie for this persona (see src/server/access). */
async function tierFor(
  compiled: CompiledPersona,
  accessEpoch: number,
  revoked: ReadonlySet<string> | undefined,
  cookie: (name: string) => string | undefined,
): Promise<Tier> {
  if (compiled.doc.access.mode === "open") return "public";
  const { readUnlock } = await import("../access/cookie");
  return readUnlock(
    compiled.slug,
    cookie(`pa_${compiled.slug}`),
    accessEpoch,
    revoked,
  )
    ? "unlocked"
    : "public";
}

/** The persona for the page being rendered (once per render). Makes the page dynamic. */
export const currentPersona = cache(async (): Promise<ResolvedPersona> => {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  return resolve(h, (name) => jar.get(name)?.value);
});

const safeDecode = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/** The persona a route handler request is for. */
export function personaForRequest(req: Request): Promise<ResolvedPersona> {
  const jar = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0)
      jar.set(part.slice(0, i).trim(), safeDecode(part.slice(i + 1).trim()));
  }
  return resolve(req.headers, (name) => jar.get(name));
}
