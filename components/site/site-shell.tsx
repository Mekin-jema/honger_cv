import Link from "next/link";
import { ArrowLeft, Download, MessageSquareText } from "lucide-react";
import { Github, Linkedin } from "@/components/brand-icons";
import { ThemeToggle } from "@/components/theme-provider";
import { avatarSrc } from "@/content/photos";
import { profile } from "@/content/profile";
import { SITE_PAGES } from "@/lib/seo";
import { withBase } from "@/lib/utils";

/** The classic, readable pages (About, Experience, Projects...): plain HTML that search engines index. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label={`${profile.name} - home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBase(avatarSrc)} alt="" width={32} height={32} className="size-8 rounded-full object-cover ring-1 ring-line" />
            <span className="hidden font-semibold tracking-tight sm:inline">{profile.name}</span>
          </Link>
          <nav aria-label="Main" className="no-scrollbar ml-auto flex items-center gap-0.5 overflow-x-auto">
            {SITE_PAGES.map((p) => (
              <Link key={p.path} href={p.path} className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-fg">
                {p.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-10 md:px-6 md:py-14">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="max-w-sm">
            <p className="font-semibold">{profile.name}</p>
            <p className="mt-1 text-sm text-muted">
              {profile.role} · {profile.headline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className="btn btn-primary py-2 text-sm">
                <MessageSquareText className="size-4" /> Ask me in the chat
              </Link>
              <a href={withBase(profile.cvPdf)} download className="btn btn-ghost py-2 text-sm">
                <Download className="size-4" /> CV (PDF)
              </a>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {SITE_PAGES.map((p) => (
              <Link key={p.path} href={p.path} className="text-muted hover:text-fg">
                {p.label}
              </Link>
            ))}
            <Link href="/cv/" className="text-muted hover:text-fg">
              CV
            </Link>
            <a href={profile.links.linkedin} rel="me noreferrer" target="_blank" className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
              <Linkedin className="size-3.5" /> LinkedIn
            </a>
            <a href={profile.links.github} rel="me noreferrer" target="_blank" className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
              <Github className="size-3.5" /> GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Visible breadcrumbs (the matching BreadcrumbList JSON-LD is emitted by each page). */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((t, i) => (
          <li key={t.path} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === trail.length - 1 ? (
              <span aria-current="page" className="text-fg">
                {t.name}
              </span>
            ) : (
              <Link href={t.path} className="hover:text-fg hover:underline">
                {i === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <ArrowLeft className="size-3.5" aria-hidden="true" /> {t.name}
                  </span>
                ) : (
                  t.name
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function JsonLd({ data }: { data: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: data.replace(/</g, "\\u003c") }} />;
}

/** Big page heading + intro, the same on every content page. */
export function PageHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header className="mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 text-4xl md:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
    </header>
  );
}
