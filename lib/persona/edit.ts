import { slugify } from "./markdown";
import type { PersonaDocInput } from "./schema";
import type { LText } from "./text";

/**
 * Small edits on a draft that touch more than one place (used by the Persona Studio). They mutate the
 * draft they're given (the Studio passes a copy). Renaming or removing a section or a question also
 * fixes every reference to it, so the draft stays valid.
 */

type Doc = PersonaDocInput;

export const enText = (t: LText | undefined) => (t === undefined ? "" : typeof t === "string" ? t : t.en);

/** `base`, or `base-2`, `base-3`... whichever is not in `used`. */
export function uniqueId(base: string, used: Iterable<string>): string {
  const taken = new Set(used);
  const root = base || "item";
  let id = root;
  for (let n = 2; taken.has(id); n++) id = `${root}-${n}`;
  return id;
}

/** An id for a new thing called `label` ("Father's job" -> "fathers-job"). */
export const idFrom = (label: string, used: Iterable<string>, fallback = "item") => uniqueId(slugify(label, fallback), used);

const replaceIn = (list: string[] | undefined, from: string, to: string | null) => {
  if (!list) return list;
  const out = list.flatMap((x) => (x === from ? (to === null ? [] : [to]) : [x]));
  return [...new Set(out)];
};

export function renameSection(doc: Doc, from: string, to: string) {
  if (from === to) return;
  for (const s of doc.sections ?? []) if (s.key === from) s.key = to;
  for (const q of doc.questions ?? []) for (const b of q.blocks ?? []) if (b.kind === "section" && b.key === from) b.key = to;
  for (const b of doc.fallback?.blocks ?? []) if (b.kind === "section" && b.key === from) b.key = to;
  if (doc.document?.sections) doc.document.sections = replaceIn(doc.document.sections, from, to);
}

export function removeSection(doc: Doc, key: string) {
  doc.sections = (doc.sections ?? []).filter((s) => s.key !== key);
  for (const q of doc.questions ?? []) q.blocks = (q.blocks ?? []).filter((b) => !(b.kind === "section" && b.key === key));
  if (doc.fallback?.blocks) doc.fallback.blocks = doc.fallback.blocks.filter((b) => !(b.kind === "section" && b.key === key));
  if (doc.document?.sections) doc.document.sections = replaceIn(doc.document.sections, key, null);
}

/** Every place a question id is referenced. */
function eachQuestionList(doc: Doc, fn: (list: string[] | undefined) => string[] | undefined) {
  for (const q of doc.questions ?? []) q.followUps = fn(q.followUps);
  doc.landing = fn(doc.landing);
  doc.defaultFollowUps = fn(doc.defaultFollowUps);
  for (const g of doc.sidebar ?? []) g.questionIds = fn(g.questionIds) ?? [];
}

export function renameQuestion(doc: Doc, from: string, to: string) {
  if (from === to) return;
  for (const q of doc.questions ?? []) if (q.id === from) q.id = to;
  eachQuestionList(doc, (list) => replaceIn(list, from, to));
  if (doc.availability?.action === from) doc.availability.action = to;
  for (const c of doc.checks ?? []) if (c.expect.intentIdIn) c.expect.intentIdIn = replaceIn(c.expect.intentIdIn, from, to);
}

export function removeQuestion(doc: Doc, id: string) {
  doc.questions = (doc.questions ?? []).filter((q) => q.id !== id);
  eachQuestionList(doc, (list) => replaceIn(list, id, null));
  if (doc.availability?.action === id) doc.availability.action = undefined;
  for (const c of doc.checks ?? []) if (c.expect.intentIdIn) c.expect.intentIdIn = replaceIn(c.expect.intentIdIn, id, null);
}

export function removeHeroPool(doc: Doc, id: string) {
  if (!doc.hero) return;
  doc.hero.pools = doc.hero.pools.filter((p) => p.id !== id);
  doc.hero.schedule = (doc.hero.schedule ?? []).filter((x) => x !== id);
}

/** Moves list[i] one step up (-1) or down (+1); no-op at the ends. */
export function move<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

/** Which Studio tab edits the field a problem points at ("questions.3.followUps.0" -> "questions"). */
export function tabForPath(path: string): "identity" | "knowledge" | "questions" | "hero" | "document" | "checks" | "json" {
  const head = path.split(".")[0];
  if (head === "sections") return "knowledge";
  if (["questions", "landing", "sidebar", "defaultFollowUps", "fallback"].includes(head)) return "questions";
  if (head === "hero" || head === "rules") return "hero";
  if (head === "document" || head === "access") return "document";
  if (["identity", "site", "labels", "availability", "name"].includes(head)) return "identity";
  if (head === "checks") return "checks";
  return "json";
}

/**
 * Adds a Bangla version to the text at `path` ("sections", 2, "items", 0, "value"), but only if its
 * English is still `en` (the draft may have changed while the translation ran). True when applied.
 */
export function setBangla(doc: Doc, path: (string | number)[], en: string, bn: string): boolean {
  let parent: unknown = doc;
  for (const key of path.slice(0, -1)) {
    if (parent === null || typeof parent !== "object") return false;
    parent = (parent as Record<string | number, unknown>)[key];
  }
  if (parent === null || typeof parent !== "object") return false;
  const last = path[path.length - 1];
  const current = (parent as Record<string | number, unknown>)[last] as LText | undefined;
  if (current === undefined || enText(current) !== en) return false;
  if (typeof current !== "string" && current.bn?.trim()) return false;
  (parent as Record<string | number, unknown>)[last] = { en, bn };
  return true;
}
