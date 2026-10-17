import type { Lang } from "./types";

/** A persona text: one English string, or English plus an optional Bangla version. */
export type LText = string | { en: string; bn?: string };

/** The text in `lang`, falling back to English (never empty when English exists). */
export function lt(value: LText | undefined, lang: Lang): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return (lang === "bn" ? value.bn?.trim() || value.en : value.en) ?? "";
}

/** Both languages of a text (for the AI context and search): "English / বাংলা" when they differ. */
export function bothLangs(value: LText | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  const bn = value.bn?.trim();
  return bn && bn !== value.en ? `${value.en} / ${bn}` : value.en;
}

/** Fills {name}-style placeholders. */
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
