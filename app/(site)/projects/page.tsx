import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs, JsonLd, PageHead } from "@/components/site/site-shell";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { breadcrumbLd, describe, graph, pageMetadata, PERSON_ID, webPageLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";

const PATH = "/projects/";
const TITLE = "Projects";
const INTRO = "Client platforms, company products, open source and personal builds - each with the problem, what I built, the numbers and the stack.";
const DESCRIPTION = describe(`Projects by ${profile.name}: ${projects.slice(0, 4).map((p) => p.name).join(", ")} and more. ${INTRO}`);

export async function generateMetadata() {
  return (await otherPersonaMetadata("projects")) ?? pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });
}

const trail = [
  { name: "Home", path: "/" },
  { name: "Projects", path: PATH },
];

const itemList = {
  "@type": "ItemList",
  name: `Projects by ${profile.name}`,
  author: { "@id": PERSON_ID },
  itemListElement: projects.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/projects/${p.id}/`), name: p.name })),
};

export default async function ProjectsPage() {
  const other = await otherPersonaPage("projects");
  if (other) return other;
  return (
    <>
      <JsonLd data={graph(webPageLd(PATH, `Projects - ${profile.name}`, DESCRIPTION), breadcrumbLd(trail), itemList)} />
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow="Work" title="Projects" intro={INTRO} />

      <ul className="grid gap-5 sm:grid-cols-2">
        {projects.map((p) => (
          <li key={p.id}>
            <article className="card group relative h-full overflow-hidden transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
              <Image
                src={`/og/${p.id}.png`}
                alt={`${p.name} project cover`}
                width={1200}
                height={630}
                className="aspect-[1.91/1] w-full border-b border-line object-cover"
              />
              <div className="relative flex flex-col p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">{p.kind} · {p.year}</p>
                    <h2 className="display mt-2 text-2xl">
                      <Link href={`/projects/${p.id}/`} className="after:absolute after:inset-0 after:rounded-[inherit]">
                        {p.name}
                      </Link>
                    </h2>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong bg-bg-soft text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-muted">{p.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.numbers.slice(0, 3).join(" · ")}</p>
                <ul aria-label={`${p.name} technology stack`} className="mt-4 flex flex-wrap gap-1.5">
                  {p.stack.slice(0, 7).map((technology) => (
                    <li key={technology} className="inline-flex items-center rounded-full border border-line-strong bg-bg-soft px-2.5 py-1 text-xs font-semibold text-fg">
                      {technology}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
