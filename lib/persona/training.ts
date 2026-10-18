import type { PersonaDoc } from "./schema";
import { enText } from "./edit";
import { hasCvKnowledge } from "./cv";

export function roleCvName(role: string, number = 1): string {
  const base = role.trim().replace(/\s+cv(?:\s+\d+)?$/i, "").trim().slice(0, 48) || "Job";
  return `${base} CV${number > 1 ? ` ${number}` : ""}`;
}

const hasText = (value: string | undefined) => !!value?.trim();
const hasListText = (values: Array<string | { en: string }> | undefined) =>
  values?.some((value) => hasText(typeof value === "string" ? value : value.en));

/** True once a customer has added personal information beyond the generated CV starter. */
export function hasTrainingContent(doc: PersonaDoc): boolean {
  if (hasCvKnowledge(doc)) return true;
  const identity = doc.identity;
  if (
    hasText(enText(identity.summary)) ||
    hasText(enText(identity.location)) ||
    hasText(identity.email) ||
    hasText(identity.phone) ||
    (identity.links?.length ?? 0) > 0
  ) {
    return true;
  }

  const filledSection = doc.sections?.some((section) =>
    section.items?.some((item) => {
      switch (section.display) {
        case "facts":
          return hasText(enText(item.value));
        case "paragraphs":
        case "list":
          return hasText(enText(item.text));
        case "timeline":
          return hasText(enText(item.label)) || hasText(item.period) || hasText(enText(item.meta)) || hasListText(item.details);
        case "tags":
          return hasListText(item.tags);
        case "gallery":
          return hasText(item.src) && item.src !== "/images/";
        case "quotes":
          return hasText(enText(item.text));
      }
    }),
  );
  if (filledSection) return true;

  return doc.questions?.some((question) =>
    question.answers.some((answer) => {
      const text = enText(answer).trim();
      return text.length >= 12 && text !== "A few words about me:";
    }),
  ) ?? false;
}
