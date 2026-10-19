import Link from "next/link";
import { FileText, MessageSquareText } from "lucide-react";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeToggle } from "@/components/theme-provider";
import { lt } from "@/lib/persona/text";
import { withBase } from "@/lib/utils";
import { resolvedLabels } from "@/server/persona/compile";
import { personaPath, sitePages } from "@/server/persona/pages";
import type { ResolvedPersona } from "@/server/persona/resolve";

/** The readable pages of a persona other than the job one: plain HTML that search engines index. */
export function PersonaShell({ p, children, wide = false, showHeader = true, fullHeight = false }: { p: ResolvedPersona; children: React.ReactNode; wide?: boolean; showHeader?: boolean; fullHeight?: boolean }) {
  const { doc } = p.compiled;
  const allPages = sitePages(p);
  const pages = allPages.filter((page) => page.kind !== "document");
  const hasAboutPage = pages.some((page) => page.path === "/about/");
  const labels = resolvedLabels(doc, p.lang);
  const home = personaPath(p, "/");
  const docPage = allPages.find((x) => x.kind === "document");
  const avatar = doc.identity.avatar?.src ?? doc.identity.photos.find((photo) => photo.visibility === "public")?.src;
  const cvPath = doc.document.kind === "cv" ? "/cv/" : doc.document.sections.length ? `/${doc.document.slug}/` : undefined;
  return (
    <div className={fullHeight ? "flex h-dvh flex-col overflow-hidden bg-bg" : "min-h-dvh bg-bg"}>
      {showHeader && <header className="no-print sticky top-0 z-20 shrink-0 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Link href={home} className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label={`${doc.identity.name} - home`}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={withBase(avatar)} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-fg text-sm font-semibold text-bg" aria-hidden="true">{doc.identity.initials}</span>
            )}
            <span className="hidden font-semibold tracking-tight sm:inline">{doc.identity.name}</span>
          </Link>
          <nav aria-label="Main" className="no-scrollbar ml-auto flex min-w-0 flex-1 items-center justify-start gap-0.5 overflow-x-auto sm:justify-end">
            {!hasAboutPage && (
              <Link href={personaPath(p, "/about/")} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">
                About
              </Link>
            )}
            {pages.map((page) => (
              <Link key={page.path} href={personaPath(p, page.path)} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">
                {page.title}
              </Link>
            ))}
            {cvPath && <Link href={personaPath(p, cvPath)} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">CV</Link>}
            <Link href={personaPath(p, "/ask/")} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">Ask AI</Link>
          </nav>
          <div className="hidden shrink-0 sm:block"><LanguageSwitch /></div>
          <ThemeToggle className="hidden shrink-0 border border-line-strong bg-card text-fg shadow-sm sm:flex" />
        </div>
      </header>}

      <main
        id="main"
        className={fullHeight
          ? "min-h-0 w-full flex-1"
          : `mx-auto w-full ${wide ? "max-w-7xl" : "max-w-3xl"} px-5 py-10 md:px-6 md:py-14`}
      >
        {children}
      </main>

      {!fullHeight && <footer className="no-print border-t border-line">
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
              {cvPath && (
                <Link href={personaPath(p, cvPath)} className="btn btn-ghost py-2 text-sm">
                  <FileText className="size-4" aria-hidden="true" /> CV
                </Link>
              )}
              <Link href={personaPath(p, "/ask/")} className="btn btn-ghost py-2 text-sm">Ask AI</Link>
            </div>
          </div>
          {(pages.length > 0 || !hasAboutPage) && (
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {pages.map((page) => (
                <Link key={page.path} href={personaPath(p, page.path)} className="text-muted hover:text-fg">
                  {page.title}
                </Link>
              ))}
              {!hasAboutPage && <Link href={personaPath(p, "/about/")} className="text-muted hover:text-fg">About</Link>}
              {cvPath && <Link href={personaPath(p, cvPath)} className="text-muted hover:text-fg">CV</Link>}
              <Link href={personaPath(p, "/ask/")} className="text-muted hover:text-fg">Ask AI</Link>
            </nav>
          )}
        </div>
      </footer>}
    </div>
  );
}
