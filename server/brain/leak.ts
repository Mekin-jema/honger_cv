import "server-only";
import { normaliseForLeak } from "./compile";

/**
 * Last line of defence: does an answer contain a value the visitor may not see? Terms come from
 * compileBrain (values of items above the visitor's tier that never appear in what they can see).
 * "#<digits>" terms match phone numbers however they are written ("+880 1675-708 783").
 */
export function findLeak(answer: string, terms: string[]): string | null {
  if (!answer || !terms.length) return null;
  const text = normaliseForLeak(answer);
  const digits = answer.replace(/\D/g, "");
  for (const term of terms) {
    if (term.startsWith("#")) {
      if (digits.includes(term.slice(1))) return term;
    } else if (text.includes(term)) return term;
  }
  return null;
}
