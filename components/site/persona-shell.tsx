import Link from "next/link";
import { FileText, MessageSquareText } from "lucide-react";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeToggle } from "@/components/theme-provider";
import { lt } from "@/lib/persona/text";
import { resolvedLabels } from "@/server/persona/compile";
import { personaPath, sitePages } from "@/server/persona/pages";
import type { ResolvedPersona } from "@/server/persona/resolve";

/** The readable pages of a persona other than the job one: plain HTML that search engines index. */
export function PersonaShell({ p, children }: { p: ResolvedPersona; children: React.ReactNode }) {
  const { doc } = p.compiled;
  const pages = sitePages(p);
  const labels = resolvedLabels(doc, p.lang);
  const home = personaPath(p, "/");
  const docPage = pages.find((x) => x.kind === "document");
  return (
    <div className="min-h-dvh bg-bg">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Link href={home} className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label={`${doc.identity.name} - home`}>
            <span className="grid size-8 place-items-center rounded-full bg-fg text-sm font-semibold text-bg" aria-hidden="true">
              {doc.identity.initials}
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">{doc.identity.name}</span>
          </Link>
          <nav aria-label="Main" className="no-scrollbar ml-auto flex items-center gap-0.5 overflow-x-auto">
            {pages.map((page) => (
              <Link key={page.path} href={personaPath(p, page.path)} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">
                {page.title}
              </Link>
            ))}
          </nav>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-10 md:px-6 md:py-14">
        {children}
      </main>

      <footer className="no-print border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="max-w-sm">
            <p className="font-semibold">{doc.identity.name}</p>
            {(doc.identity.role || doc.identity.location) && (
              <p className="mt-1 text-sm text-muted">{[lt(doc.identity.role, p.lang), lt(doc.identity.location, p.lang)].filter(Boolean).join(" · ")}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={home} className="btn btn-primary py-2 text-sm">
                <MessageSquareText className="size-4" aria-hidden="true" /> {labels.notFoundBack}
              </Link>
              {docPage && (
                <Link href={personaPath(p, docPage.path)} className="btn btn-ghost py-2 text-sm">
                  <FileText className="size-4" aria-hidden="true" /> {docPage.title}
                </Link>
              )}
            </div>
          </div>
          {pages.length > 0 && (
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {pages.map((page) => (
                <Link key={page.path} href={personaPath(p, page.path)} className="text-muted hover:text-fg">
                  {page.title}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </footer>
    </div>
  );
}
