import type { MdItem, MdParse, MdQuestion, MdSection } from "./markdown";
import type { PersonaDocInput } from "./schema";
import type { LText } from "./text";

/**
 * Applies a parsed Markdown template to a draft. The template is the truth for what it contains, and
 * everything it can't express is kept: an item's nested entries, image sizes, a section's chat and
 * document switches, a question's icon, visibility and non-section cards. Items and questions are
 * matched by id first, then by their English label (or image path), so a re-import updates in place.
 */

type Doc = PersonaDocInput;
type Section = NonNullable<Doc["sections"]>[number];
type Item = NonNullable<Section["items"]>[number];
type Question = NonNullable<Doc["questions"]>[number];

export type MergeSummary = {
  sectionsAdded: string[];
  sectionsUpdated: string[];
  sectionsUnchanged: string[];
  sectionsRemoved: string[];
  itemsAdded: number;
  itemsChanged: number;
  itemsRemoved: number;
  questionsAdded: string[];
  questionsUpdated: string[];
  questionsRemoved: string[];
  /** Answers the owner still has to write ("TODO" from the AI suggestions). */
  todo: number;
};

export type MergeOptions = { removeMissingSections?: boolean; removeMissingQuestions?: boolean };

const en = (t: LText | undefined) => (t === undefined ? "" : typeof t === "string" ? t : t.en).trim().toLowerCase();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The fields each display writes; the rest of an existing item is kept. */
const FIELDS: Record<MdSection["display"], (keyof MdItem)[]> = {
  facts: ["label", "value"],
  paragraphs: ["text"],
  list: ["text"],
  timeline: ["period", "label", "meta", "details"],
  tags: ["label", "tags"],
  gallery: ["src", "label"],
  quotes: ["text", "label", "meta"],
};

const matchKey = (display: MdSection["display"], it: MdItem | Item): string => {
  switch (display) {
    case "gallery":
      return (it.src ?? "").trim().toLowerCase();
    case "tags":
      return en(it.label) || (it.tags?.[0] ?? "").toLowerCase();
    case "paragraphs":
    case "list":
      return "";
    default:
      return en(it.label);
  }
};

function mergeItems(display: MdSection["display"], existing: Item[], incoming: MdItem[], summary: MergeSummary): Item[] {
  const left = new Set(existing.map((_, i) => i));
  const find = (test: (e: Item) => boolean) => existing.findIndex((e, k) => left.has(k) && test(e));
  const slots: { item: Item | MdItem; added: boolean }[] = [];
  for (const it of incoming) {
    let i = find((e) => e.id === it.id);
    const key = matchKey(display, it);
    if (i < 0 && key) i = find((e) => matchKey(display, e) === key);
    if (i < 0) {
      slots.push({ item: it, added: true });
      continue;
    }
    left.delete(i);
    slots.push({ item: update(display, existing[i], it, summary), added: false });
  }
  if (display === "paragraphs" || display === "list") {
    // Unlabelled items: the new ones pair with the unmatched old ones, in order.
    for (const slot of slots) {
      const i = [...left][0];
      if (!slot.added || i === undefined) continue;
      left.delete(i);
      slot.item = update(display, existing[i], slot.item as MdItem, summary);
      slot.added = false;
    }
  }
  summary.itemsAdded += slots.filter((x) => x.added).length;
  // Unfilled template items (nothing to lose) are kept, at the end; real ones the text left out are removed.
  const placeholders = [...left].filter((i) => isEmpty(existing[i]));
  summary.itemsRemoved += left.size - placeholders.length;
  for (const i of placeholders) slots.push({ item: existing[i], added: false });
  const seen = new Set<string>();
  return slots.map(({ item }) => {
    let id = item.id;
    for (let n = 2; seen.has(id); n++) id = `${item.id}-${n}`;
    seen.add(id);
    return clean({ ...(item as Item), id });
  });
}

function update(display: MdSection["display"], old: Item, it: MdItem, summary: MergeSummary): Item {
  const next: Record<string, unknown> = { ...old };
  for (const f of FIELDS[display]) {
    // An empty placeholder ("") the text leaves out stays as it was.
    if (it[f] === undefined && old[f as keyof Item] === "") continue;
    next[f] = it[f];
  }
  next.visibility = it.visibility;
  const merged = clean(next as Item);
  if (!same(merged, clean({ ...old }))) summary.itemsChanged++;
  return merged;
}

const filled = (t: LText | undefined) => !!t && (typeof t === "string" ? t.trim() : t.en.trim() || t.bn?.trim());
/** A template item the owner hasn't filled in yet (same rule as the compiler's hasContent). */
const isEmpty = (it: Item) => !(filled(it.value) || filled(it.text) || it.details?.length || it.sub?.length || it.tags?.length || it.src);

/** Drops undefined fields (so unchanged items compare equal and the JSON stays tidy). */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function mergeQuestion(old: Question | undefined, q: MdQuestion, sections: Section[]): Question {
  const sectionBlocks = q.blocks.filter((b) => sections.some((s) => s.key === b.key));
  if (!old) {
    const unlocked = sectionBlocks.some((b) => sections.find((s) => s.key === b.key)?.visibility === "unlocked");
    return {
      id: q.id,
      label: q.label,
      prompt: q.prompt,
      keywords: q.keywords,
      answers: q.answers.length ? q.answers : ["TODO"],
      blocks: sectionBlocks.slice(0, 4),
      followUps: q.followUps.slice(0, 4),
      primary: q.primary,
      icon: "sparkles",
      visibility: unlocked ? "unlocked" : "public",
    };
  }
  const others = (old.blocks ?? []).filter((b) => b.kind !== "section");
  return {
    ...old,
    label: q.label,
    prompt: q.prompt,
    keywords: q.keywords,
    answers: q.answers.length ? q.answers : old.answers,
    blocks: [...sectionBlocks, ...others].slice(0, 4),
    followUps: q.followUps.slice(0, 4),
    primary: q.primary,
  };
}

export function mergeMarkdown(doc: Doc, parsed: MdParse, opts: MergeOptions = {}): { doc: Doc; summary: MergeSummary } {
  const summary: MergeSummary = {
    sectionsAdded: [],
    sectionsUpdated: [],
    sectionsUnchanged: [],
    sectionsRemoved: [],
    itemsAdded: 0,
    itemsChanged: 0,
    itemsRemoved: 0,
    questionsAdded: [],
    questionsUpdated: [],
    questionsRemoved: [],
    todo: 0,
  };
  const existing = doc.sections ?? [];
  const usedSections = new Set<number>();
  const sections: Section[] = [];

  for (const ps of parsed.sections) {
    let at = existing.findIndex((s, i) => !usedSections.has(i) && s.key === ps.key);
    if (at < 0) at = existing.findIndex((s, i) => !usedSections.has(i) && en(s.title) === en(ps.title));
    if (at < 0) {
      const items = mergeItems(ps.display, [], ps.items, summary);
      sections.push({ key: ps.key, title: ps.title, display: ps.display, visibility: ps.visibility, inChat: ps.visibility !== "private", inDocument: ps.visibility !== "private", inSite: false, items });
      summary.sectionsAdded.push(ps.key);
      continue;
    }
    usedSections.add(at);
    const old = existing[at];
    const before = { ...summary };
    const items = mergeItems(ps.display, old.items ?? [], ps.items, summary);
    const next: Section = {
      ...old,
      title: ps.title,
      display: ps.display,
      visibility: ps.visibility,
      items,
      ...(ps.visibility === "private" ? { inChat: false } : {}),
      ...(ps.visibility !== "public" ? { inSite: false } : {}),
    };
    sections.push(next);
    const touched = summary.itemsAdded !== before.itemsAdded || summary.itemsChanged !== before.itemsChanged || summary.itemsRemoved !== before.itemsRemoved;
    (touched || !same(clean({ ...old, items: undefined }), clean({ ...next, items: undefined })) ? summary.sectionsUpdated : summary.sectionsUnchanged).push(old.key);
  }
  // Sections the text doesn't mention stay where they were (or go, when asked).
  existing.forEach((s, i) => {
    if (usedSections.has(i)) return;
    if (opts.removeMissingSections) summary.sectionsRemoved.push(s.key);
    else sections.splice(Math.min(i, sections.length), 0, s);
  });

  const oldQuestions = doc.questions ?? [];
  const usedQuestions = new Set<number>();
  const questions: Question[] = [];
  for (const q of parsed.questions) {
    let at = oldQuestions.findIndex((o, i) => !usedQuestions.has(i) && o.id === q.id);
    if (at < 0) at = oldQuestions.findIndex((o, i) => !usedQuestions.has(i) && en(o.label) === en(q.label));
    if (at >= 0) usedQuestions.add(at);
    const merged = mergeQuestion(at >= 0 ? oldQuestions[at] : undefined, q, sections);
    if (at < 0) {
      // A new id must not clash with a question the text didn't mention.
      let id = merged.id;
      for (let n = 2; oldQuestions.some((o, i) => !usedQuestions.has(i) && o.id === id) || questions.some((o) => o.id === id); n++) id = `${merged.id}-${n}`;
      merged.id = id;
      summary.questionsAdded.push(id);
    } else if (!same(merged, oldQuestions[at])) summary.questionsUpdated.push(merged.id);
    if (merged.answers.some((a) => /^\s*TODO\b/i.test(typeof a === "string" ? a : a.en))) summary.todo++;
    questions.push(merged);
  }
  oldQuestions.forEach((q, i) => {
    if (usedQuestions.has(i)) return;
    if (opts.removeMissingQuestions && parsed.questions.length) summary.questionsRemoved.push(q.id);
    else questions.splice(Math.min(i, questions.length), 0, q);
  });

  return { doc: { ...doc, sections, questions }, summary };
}

/** "3 sections updated, 1 added; 12 facts changed..." for the import preview. */
export function describeMerge(s: MergeSummary): string[] {
  const out: string[] = [];
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  if (s.sectionsAdded.length) out.push(`New ${s.sectionsAdded.length === 1 ? "section" : "sections"}: ${s.sectionsAdded.join(", ")}`);
  if (s.sectionsUpdated.length) out.push(`Updated: ${s.sectionsUpdated.join(", ")}`);
  if (s.sectionsRemoved.length) out.push(`Removed: ${s.sectionsRemoved.join(", ")}`);
  if (s.itemsAdded || s.itemsChanged || s.itemsRemoved)
    out.push(`${n(s.itemsAdded, "item")} added, ${n(s.itemsChanged, "item")} changed, ${n(s.itemsRemoved, "item")} removed`);
  if (s.questionsAdded.length) out.push(`New questions: ${s.questionsAdded.join(", ")}`);
  if (s.questionsUpdated.length) out.push(`Updated questions: ${s.questionsUpdated.join(", ")}`);
  if (s.questionsRemoved.length) out.push(`Removed questions: ${s.questionsRemoved.join(", ")}`);
  if (s.todo) out.push(`${n(s.todo, "answer")} still say TODO: write ${s.todo === 1 ? "it" : "them"} in the Questions tab.`);
  if (!out.length) out.push("Nothing changes: the text matches the draft.");
  return out;
}
