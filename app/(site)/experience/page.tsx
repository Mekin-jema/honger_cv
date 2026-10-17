import Link from "next/link";
import { Breadcrumbs, JsonLd, PageHead } from "@/components/site/site-shell";
import { experience } from "@/content/experience";
import { profile } from "@/content/profile";
import { breadcrumbLd, describe, graph, pageMetadata, webPageLd } from "@/lib/seo";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";

const PATH = "/experience/";
const TITLE = "Experience";
const INTRO = `${profile.role} with 5+ years of production work in JavaScript and TypeScript for clients in France, the UK and Germany - from front-end experimentation to full-stack platforms on AWS and Azure.`;
const DESCRIPTION = describe(`Work experience of ${profile.name}: ${INTRO}`);

export async function generateMetadata() {
  return (await otherPersonaMetadata("experience")) ?? pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });
}

const trail = [
  { name: "Home", path: "/" },
  { name: "Experience", path: PATH },
];

export default async function ExperiencePage() {
  const other = await otherPersonaPage("experience");
  if (other) return other;
  return (
    <>
      <JsonLd data={graph(webPageLd(PATH, `Experience - ${profile.name}`, DESCRIPTION), breadcrumbLd(trail))} />
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow="Career" title="Experience" intro={INTRO} />

      <ol className="space-y-12">
        {experience.map((job) => (
          <li key={job.company}>
            <article>
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="display text-2xl md:text-3xl">
                  {job.role} <span className="text-muted">· {job.company}</span>
                </h2>
                <p className="text-sm font-semibold text-faint">{job.period}</p>
              </header>
              <p className="mt-1 text-sm text-muted">
                {[job.location, job.context].filter(Boolean).join(" · ")}
              </p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-faint">
                {job.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              {job.engagements?.map((e) => (
                <section key={e.title} className="mt-6 border-l-2 border-line pl-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <h3 className="text-lg font-semibold">{e.title}</h3>
                    <p className="text-sm text-faint">{e.period}</p>
                  </div>
                  <p className="text-sm text-muted">{e.role}</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-faint">
                    {e.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {e.stack && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
                      {e.stack.map((s) => (
                        <li key={s} className="tag">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </article>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-sm">
        The work above in detail: <Link href="/projects/" className="font-semibold underline-offset-4 hover:underline">projects and case studies</Link>, or
        the <Link href="/cv/" className="font-semibold underline-offset-4 hover:underline">full CV</Link>.
      </p>
    </>
  );
}
