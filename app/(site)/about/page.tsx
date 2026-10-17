import Link from "next/link";
import { Breadcrumbs, JsonLd, PageHead } from "@/components/site/site-shell";
import { education, languages, quotes } from "@/content/details";
import { beliefs } from "@/content/intro";
import { photos } from "@/content/photos";
import { profile } from "@/content/profile";
import { breadcrumbLd, describe, graph, pageMetadata, profilePageLd } from "@/lib/seo";
import { withBase } from "@/lib/utils";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";

const PATH = "/about/";
const TITLE = "About";
const DESCRIPTION = describe(
  `About ${profile.name}, ${profile.role} in Dhaka: ${profile.summary}`,
);

export async function generateMetadata() {
  return (await otherPersonaMetadata("about")) ?? pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });
}

const trail = [
  { name: "Home", path: "/" },
  { name: "About", path: PATH },
];

export default async function AboutPage() {
  const other = await otherPersonaPage("about");
  if (other) return other;
  const photo = photos[0];
  return (
    <>
      <JsonLd data={graph(profilePageLd(PATH, `About ${profile.name}`), breadcrumbLd(trail))} />
      <Breadcrumbs trail={trail} />
      <PageHead eyebrow={profile.role} title={`About ${profile.name}`} intro={profile.summary} />

      <figure className="mb-12 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBase(photo.src)}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          className="h-56 w-auto rounded-2xl object-cover shadow-sm"
          loading="eager"
          fetchPriority="high"
        />
        <figcaption className="text-sm text-muted">
          {profile.name} · {profile.role} · {profile.location}
          <br />
          {profile.openTo}.
        </figcaption>
      </figure>

      <section aria-labelledby="numbers" className="mb-12">
        <h2 id="numbers" className="display text-2xl">
          In numbers
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.stats.map((s) => (
            <li key={s.label} className="card p-4">
              <p className="display text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="what" className="mb-12">
        <h2 id="what" className="display text-2xl">
          What I do
        </h2>
        <dl className="mt-4 divide-y divide-line">
          {profile.focus.map((f) => (
            <div key={f.area} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <dt className="shrink-0 font-semibold sm:w-36">{f.area}</dt>
              <dd className="text-muted">{f.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm">
          See my <Link href="/experience/" className="font-semibold underline-offset-4 hover:underline">experience</Link>, the{" "}
          <Link href="/projects/" className="font-semibold underline-offset-4 hover:underline">projects I&apos;ve built</Link> and my{" "}
          <Link href="/skills/" className="font-semibold underline-offset-4 hover:underline">skills</Link>.
        </p>
      </section>

      <section id="beliefs" aria-labelledby="beliefs-h" className="mb-12 scroll-mt-24">
        <h2 id="beliefs-h" className="display text-2xl">
          What I believe
        </h2>
        <ul className="mt-4 space-y-2">
          {beliefs.map((b) => (
            <li key={b} className="font-serif text-xl leading-snug">
              &ldquo;{b}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      <section id="education" aria-labelledby="education-h" className="mb-12 scroll-mt-24">
        <h2 id="education-h" className="display text-2xl">
          Education
        </h2>
        <div className="mt-4">
          <h3 className="font-semibold">
            {education.degree} - {education.school}, {education.year}
          </h3>
          <p className="mt-1 text-muted">{education.capstone}</p>
          <p className="mt-3 text-sm text-muted">
            <span className="font-semibold text-fg">Continued learning:</span> {education.courses.join(", ")}
          </p>
        </div>
      </section>

      <section id="languages" aria-labelledby="languages-h" className="mb-12 scroll-mt-24">
        <h2 id="languages-h" className="display text-2xl">
          Languages
        </h2>
        <ul className="mt-4 space-y-1">
          {languages.map((l) => (
            <li key={l.name}>
              <span className="font-semibold">{l.name}</span> <span className="text-muted">- {l.level}{l.cefr !== "Native" ? ` (${l.cefr})` : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="recommendations" aria-labelledby="recs-h" className="scroll-mt-24">
        <h2 id="recs-h" className="display text-2xl">
          Recommendations
        </h2>
        {quotes.length > 0 ? (
          <div className="mt-4 space-y-4">
            {quotes.map((q) => (
              <figure key={q.name} className="card p-5">
                <blockquote className="font-serif text-xl leading-snug">&ldquo;{q.highlight}&rdquo;</blockquote>
                <figcaption className="mt-3 text-sm text-muted">
                  <span className="font-semibold text-fg">{q.name}</span>, {q.title} · {q.relation}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Recommendations are not included in this portfolio yet.</p>
        )}
        <p className="mt-4 text-sm">
          <a href={quotes.length > 0 ? profile.links.linkedinRecommendations : profile.links.linkedin} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">
            {quotes.length > 0 ? "Read all recommendations on LinkedIn" : "View my LinkedIn profile"}
          </a>
        </p>
      </section>
    </>
  );
}
