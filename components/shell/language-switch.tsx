"use client";

import { Languages } from "lucide-react";
import { usePersona } from "@/lib/persona/context";
import { withBase } from "@/lib/utils";

/**
 * "বাংলা" / "English": the same page in the persona's other language (Bangla pages live under /bn/).
 * The link points at the other language's home (crawlers find every page through hreflang); a click
 * keeps the visitor on the page they are reading.
 */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const persona = usePersona();
  if (persona.languages.length < 2 || persona.defaultLang === "bn") return null;
  const toBangla = persona.lang !== "bn";
  const root = withBase(`${persona.base}${toBangla ? "/bn" : ""}/`);
  const switchPath = (pathname: string) => {
    const prefix = withBase(persona.base);
    let rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
    if (!rest.startsWith("/")) rest = `/${rest}`;
    rest = rest === "/bn" || rest.startsWith("/bn/") ? rest.slice(3) || "/" : rest;
    return `${prefix}${toBangla ? "/bn" : ""}${rest}`;
  };
  return (
    <a
      href={root}
      hrefLang={toBangla ? "bn" : "en"}
      lang={toBangla ? "bn" : "en"}
      onClick={(e) => {
        e.preventDefault();
        // A full load on purpose: <html lang>, the fonts and every text change with the language.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`${switchPath(window.location.pathname)}${window.location.search}`);
      }}
      className={`flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-fg ${className}`}
    >
      <Languages className="size-4" aria-hidden="true" />
      {persona.labels.languageSwitch}
    </a>
  );
}
