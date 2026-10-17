import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { SectionBody } from "@/components/blocks/section-block";
import { RequestAccess } from "@/components/blocks/request-access";
import { RichText } from "@/components/chat/rich-text";
import { lt } from "@/lib/persona/text";
import { graph } from "@/lib/seo";
import { withBase } from "@/lib/utils";
import { clientSection, documentOpen, documentPdfPath, resolvedLabels, visibleAt } from "@/server/persona/compile";
import { personaPath, personaPersonLd, sectionPage } from "@/server/persona/pages";
import type { ResolvedPersona } from "@/server/persona/resolve";
import { personaUrl } from "@/server/persona/urls";
import { PrintButton } from "./print-button";
import { Breadcrumbs, JsonLd, PageHead } from "./site-shell";

/** /<section>/ or the document page of a persona other than the job one. 404 when there is no such page. */
export async function PersonaPage({ p, pageKey }: { p: ResolvedPersona; pageKey: string }) {
  const { doc } = p.compiled;
  if (pageKey === doc.document.slug && doc.document.sections.length) return <DocumentPage p={p} />;
  const page = sectionPage(p, pageKey);
  if (!page) notFound();
  const h = await headers();
  const labels = resolvedLabels(doc, p.lang);
  const home = personaPath(p, "/");
  const path = `/${pageKey}/`;
  const trail = [
    { name: doc.identity.shortName, path: home },
    { name: page.section.title, path: personaPath(p, path) },
  ];
  // Questions whose answers show this section: the page's own small FAQ, linking into the chat.
  const related = doc.questions.filter((q) => q.visibility === "public" && q.blocks.some((b) => b.kind === "section" && b.key === pageKey));
  const ld = graph(personaPersonLd(p, h), {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: doc.identity.name, item: personaUrl(p, h, "/") },
      { "@type": "ListItem", position: 2, name: page.section.title, item: personaUrl(p, h, path) },
    ],
  });
  return (
    <>
      {doc.site.indexable && <JsonLd data={ld} />}
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow={doc.identity.name} title={page.section.title} />
      <SectionBody s={page.section} />
      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-12 space-y-4">
          <h2 id="related" className="text-xl font-semibold tracking-tight">
            {labels.askAbout}
          </h2>
          <ul className="space-y-3">
            {related.map((q) => (
              <li key={q.id} className="card p-4">
                <a href={withBase(personaPath(p, `/ask/${q.id}/`))} className="font-semibold hover:underline">
                  {lt(q.prompt, p.lang)}
                </a>
                <p className="mt-1 text-[15px] text-muted">
                  <RichText text={lt(q.answers[0], p.lang)} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-12">
        <a href={withBase(home)} className="btn btn-primary">
          <MessageSquareText className="size-4" aria-hidden="true" /> {labels.notFoundBack}
        </a>
      </p>
    </>
  );
}

/** The biodata (or other document) as a printable page; behind a code when the document is gated. */
function DocumentPage({ p }: { p: ResolvedPersona }) {
  const { doc } = p.compiled;
  const labels = resolvedLabels(doc, p.lang);
  const title = lt(doc.document.title, p.lang) || labels.documentButton;
  if (!documentOpen(doc, p.tier))
    return (
      <>
        <PageHead eyebrow={doc.identity.name} title={title} intro={labels.documentLocked} />
        <RequestAccess />
      </>
    );
  // clientSection keeps only the items this visitor may see; private sections never print.
  const sections = doc.document.sections
    .map((key) => doc.sections.find((s) => s.key === key))
    .filter((s): s is NonNullable<typeof s> => !!s && visibleAt(s.visibility, p.tier))
    .map((s) => clientSection(s, p.tier, p.lang))
    .filter((s) => s.items.length);
  const photo = doc.document.showPhoto ? doc.identity.photos.find((ph) => visibleAt(ph.visibility, p.tier)) : undefined;
  const pdf = p.compiled.pdfPath ? withBase(`${p.base}${documentPdfPath(doc)}`) : undefined;
  return (
    <article className="biodata space-y-8">
      <header className="flex flex-wrap items-start gap-5">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={withBase(photo.src)} alt={lt(photo.alt, p.lang)} width={photo.width} height={photo.height} className="h-40 w-32 rounded-xl object-cover ring-1 ring-line" />
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{title}</p>
          <h1 className="display mt-2 text-4xl">{doc.identity.name}</h1>
          {(doc.identity.role || doc.identity.location) && <p className="mt-2 text-lg text-muted">{[lt(doc.identity.role, p.lang), lt(doc.identity.location, p.lang)].filter(Boolean).join(" · ")}</p>}
          {doc.document.updated && <p className="mt-1 text-sm text-faint">{doc.document.updated}</p>}
        </div>
        <div className="no-print flex gap-2">
          <PrintButton label={labels.printButton} />
          {pdf && (
            <a href={pdf} download className="btn btn-primary py-2 text-sm">
              {labels.documentDownload}
            </a>
          )}
        </div>
      </header>
      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`doc-${s.key}`} className="break-inside-avoid-page space-y-3">
          <h2 id={`doc-${s.key}`} className="border-b border-line pb-1.5 text-lg font-semibold tracking-tight">
            {s.title}
          </h2>
          <SectionBody s={s} />
        </section>
      ))}
    </article>
  );
}
