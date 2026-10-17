import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Names that must never appear anywhere public (clients the owner may not name). They live in the
 * git-ignored info/forbidden-terms.txt, one per line, so this public repo never contains them; without
 * that file the checks that use them are skipped.
 */
export function forbiddenTerms(): string[] {
  const file = path.resolve(import.meta.dirname, "../../info/forbidden-terms.txt");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#"));
}

/** The forbidden terms found in `text` (case-insensitive). */
export const forbiddenIn = (text: string, terms = forbiddenTerms()) => terms.filter((t) => text.toLowerCase().includes(t));
