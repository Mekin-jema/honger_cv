import Link from "next/link";
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

      <ul className="space-y-4">
        {projects.map((p) => (
          <li key={p.id}>
            <article className="card group relative p-5 transition-colors hover:bg-bg-soft md:p-6">
              <p className="eyebrow">
                {p.kind} · {p.year}
              </p>
              <h2 className="display mt-2 text-2xl">
                <Link href={`/projects/${p.id}/`} className="after:absolute after:inset-0 after:rounded-[inherit]">
                  {p.name}
                </Link>
              </h2>
              <p className="mt-2 leading-relaxed text-muted">{p.tagline}</p>
              <p className="mt-3 text-sm text-muted">{p.numbers.slice(0, 3).join(" · ")}</p>
              <ArrowUpRight className="absolute top-5 right-5 size-5 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
