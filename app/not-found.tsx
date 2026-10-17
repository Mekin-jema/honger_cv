import type { Metadata } from "next";
import { currentPersona } from "@/server/persona/resolve";
import { resolvedLabels } from "@/server/persona/compile";
import { withBase } from "@/lib/utils";

// The root title template adds " - <name>". Next already adds robots noindex to 404s.
export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const { compiled, lang, base } = await currentPersona();
  const labels = resolvedLabels(compiled.doc, lang);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6">
      <h1 className="display text-5xl md:text-7xl">{labels.notFoundTitle}</h1>
      <p className="mt-4 text-lg text-muted">{labels.notFoundText}</p>
      {/* A plain link (not next/link): it may lead to another persona's prefix. */}
      <a href={withBase(`${base}/`)} className="btn btn-primary mt-8 self-start">
        {labels.notFoundBack}
      </a>
    </main>
  );
}
