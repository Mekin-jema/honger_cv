import Link from "next/link";
import { Breadcrumbs, JsonLd, PageHead } from "@/components/site/site-shell";
import { cloud, skills } from "@/content/details";
import { profile } from "@/content/profile";
import { breadcrumbLd, describe, graph, pageMetadata, webPageLd } from "@/lib/seo";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";

const PATH = "/skills/";
const TITLE = "Skills";
const INTRO = "JavaScript and TypeScript end to end: React and Next.js on the front, Node.js and NestJS on the back, PostgreSQL underneath, and AWS or Azure to run it. Every skill below shows up in real projects.";
const DESCRIPTION = describe(`Skills of ${profile.name}: ${INTRO}`);

export async function generateMetadata() {
  return (await otherPersonaMetadata("skills")) ?? pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });
}

const trail = [
  { name: "Home", path: "/" },
  { name: "Skills", path: PATH },
];

export default async function SkillsPage() {
  const other = await otherPersonaPage("skills");
  if (other) return other;
  return (
    <>
      <JsonLd data={graph(webPageLd(PATH, `Skills - ${profile.name}`, DESCRIPTION), breadcrumbLd(trail))} />
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow="Tech stack" title="Skills" intro={INTRO} />

      <section aria-label="Honey Badger AI project stack" className="card mb-5 p-4 md:p-5">
        <h2 className="text-base font-semibold">Honey Badger AI project stack</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {["Python", "FastAPI", "LangChain", "LangGraph", "OpenSearch", "OpenRouter", "Next.js"].map((skill) => (
            <li key={skill} className="inline-flex items-center rounded-lg border border-line-strong bg-bg-soft px-2.5 py-1.5 text-sm font-medium text-fg">
              {skill}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {skills.map((g) => (
          <section key={g.group} aria-labelledby={`g-${g.group}`} className="card min-w-0 p-4 md:p-5">
            <h2 id={`g-${g.group}`} className="flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
              {g.group}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {g.items.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center rounded-lg border border-line-strong bg-bg-soft px-2.5 py-1.5 text-sm font-medium text-fg"
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section id="cloud" aria-labelledby="cloud-h" className="mt-14 scroll-mt-24">
        <h2 id="cloud-h" className="display text-2xl">
          Cloud and DevOps in practice
        </h2>
        <dl className="mt-4 divide-y divide-line">
          {cloud.map((c) => (
            <div key={c.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <dt className="shrink-0 font-semibold sm:w-56">{c.name}</dt>
              <dd className="text-muted">{c.where}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-12 text-sm">
        See these skills at work in my <Link href="/projects/" className="font-semibold underline-offset-4 hover:underline">projects</Link> and{" "}
        <Link href="/experience/" className="font-semibold underline-offset-4 hover:underline">experience</Link>.
      </p>
    </>
  );
}
