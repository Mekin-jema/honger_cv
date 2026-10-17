import type { Question } from "./persona/types";

/**
 * Lower-case, accents removed, anything but letters, digits, "/" and spaces turned into spaces.
 * Unicode-aware: Bangla letters and vowel signs (marks) are kept, so Bangla keywords match too.
 */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}/ ]+/gu, " ")
    .trim();

const STOP = new Set(["a", "an", "the", "me", "my", "your", "you", "is", "are", "do", "can", "i", "what", "show", "tell", "about", "of", "to", "in", "on", "and", "please"]);

function score(q: Question, tokens: string[], full: string): number {
  const label = normalize(q.label);
  let s = 0;
  if (label.startsWith(full)) s += 6;
  else if (label.includes(full)) s += 3;
  for (const t of tokens) {
    for (const k of q.keywords) {
      const kw = normalize(k);
      if (kw === t) s += 4;
      else if (t.length >= 2 && kw.startsWith(t)) s += 2;
    }
    if (label.split(" ").some((w) => w.startsWith(t))) s += 2;
  }
  // Primary topics win ties against drill-downs (project pages and the like).
  return s > 0 && q.primary ? s + 0.5 : s;
}

/** Ranks the persona's questions for what the visitor typed. Empty input or "/" lists the main topics. */
export function matchIntents(query: string, questions: Question[], limit = 6): Question[] {
  const primary = questions.filter((q) => q.primary);
  const full = normalize(query).replace(/^\//, "").trim();
  // "/" alone lists every main topic, like a command palette.
  if (!full) return query.trim() === "/" ? primary : primary.slice(0, limit);
  const tokens = full.split(/\s+/).filter((t) => t && !STOP.has(t));
  const searchTokens = tokens.length ? tokens : full.split(/\s+/);
  return questions
    .map((q) => ({ q, s: score(q, searchTokens, full) }))
    .filter((r) => r.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.q);
}

/**
 * The question whose label is exactly what was typed (or, for a single word, a keyword of the best
 * match), so the ready-made answer can play without asking the AI: "projects", "skills", "docker".
 */
export function exactIntent(query: string, questions: Question[], top?: Question): Question | undefined {
  const q = normalize(query).replace(/^\//, "").trim();
  if (!q) return undefined;
  const byLabel = questions.find((i) => normalize(i.label) === q);
  if (byLabel) return byLabel;
  if (top && !q.includes(" ") && top.keywords.some((k) => normalize(k) === q)) return top;
  return undefined;
}
