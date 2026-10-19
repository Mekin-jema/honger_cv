import Link from "next/link";
import { ArrowRight, Mail, MapPin, MessageSquareText } from "lucide-react";
import { SectionBody } from "@/components/blocks/section-block";
import { lt } from "@/lib/persona/text";
import { clientSection, hasContent, itemVisibility } from "@/server/persona/compile";
import type { ResolvedPersona } from "@/server/persona/resolve";
import { personaPath } from "@/server/persona/pages";
import { withBase } from "@/lib/utils";

export function PublicPersonaProfile({ p }: { p: ResolvedPersona }) {
  const { doc } = p.compiled;
  const sections = doc.sections
    .filter((section) =>
      section.visibility === "public" &&
      section.items.some((item) => hasContent(item) && itemVisibility(section, item) === "public"),
    )
    .map((section) => clientSection(section, "public", p.lang))
    .filter((section) => section.items.length > 0);
  const photo = doc.identity.photos.find((candidate) => candidate.visibility === "public");
  const portrait = doc.identity.avatar?.src
    ? { src: doc.identity.avatar.src, alt: lt(doc.identity.avatar.alt, p.lang) || doc.identity.name, width: 480, height: 480 }
    : photo
      ? { src: photo.src, alt: lt(photo.alt, p.lang) || doc.identity.name, width: photo.width, height: photo.height }
      : undefined;
  const ask = personaPath(p, "/ask/");
  const cv = doc.document.kind === "cv" && !doc.document.gated
    ? personaPath(p, "/cv/")
    : undefined;

  return (
    <div className="space-y-12">
      <header className="space-y-5">
        <div className="space-y-3">
          <p className="eyebrow">{lt(doc.identity.role, p.lang) || "Professional profile"}</p>
          <h1 className="display text-4xl sm:text-5xl">{doc.identity.name}</h1>
          {doc.identity.summary && (
            <p className="max-w-2xl text-lg leading-8 text-muted">{lt(doc.identity.summary, p.lang)}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {doc.identity.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {lt(doc.identity.location, p.lang)}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Link href={ask} className="btn btn-primary">
              <MessageSquareText className="size-4" aria-hidden="true" />
              Ask my AI assistant
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {cv && (
              <Link href={cv} className="btn btn-ghost">
                View CV
              </Link>
            )}
            {doc.identity.email && (
              <a href={`mailto:${doc.identity.email}`} className="btn btn-ghost">
                <Mail className="size-4" aria-hidden="true" />
                Contact
              </a>
            )}
          </div>
          {portrait && (
            <figure className="flex items-center gap-4 sm:justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withBase(portrait.src)}
                alt={portrait.alt}
                width={portrait.width}
                height={portrait.height}
                className="size-24 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-line sm:size-32"
              />
              <figcaption className="min-w-0 text-sm text-muted sm:hidden">
                {doc.identity.name}
                {doc.identity.role && <span className="block">{lt(doc.identity.role, p.lang)}</span>}
              </figcaption>
            </figure>
          )}
        </div>

        {doc.identity.links.length > 0 && (
          <nav aria-label="Profile links" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {doc.identity.links.map((link) => (
              <a
                key={`${link.kind}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`profile-${section.key}`} className="space-y-4">
          <h2 id={`profile-${section.key}`} className="display text-2xl sm:text-3xl">
            {section.title}
          </h2>
          <SectionBody s={section} />
        </section>
      ))}

      {sections.length === 0 && (
        <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted">
          This profile is being updated. Ask the AI assistant for more information.
        </p>
      )}

    </div>
  );
}
