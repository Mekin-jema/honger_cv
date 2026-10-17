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

      <div className="space-y-8">
        {skills.map((g) => (
          <section key={g.group} aria-labelledby={`g-${g.group}`}>
            <h2 id={`g-${g.group}`} className="text-lg font-semibold">
              {g.group}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {g.items.map((s) => (
                <li key={s} className="tag">
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
