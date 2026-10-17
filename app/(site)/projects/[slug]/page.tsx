import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Github } from "@/components/brand-icons";
import { Breadcrumbs, JsonLd } from "@/components/site/site-shell";
import { profile } from "@/content/profile";
import { projectById, projects } from "@/content/projects";
import { breadcrumbLd, describe, graph, pageMetadata, projectLd, webPageLd } from "@/lib/seo";
import { currentPersona } from "@/server/persona/resolve";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const p = projectById(slug);
  if (!p || !(await currentPersona()).compiled.doc.legacy) return {};
  return pageMetadata({
    path: `/projects/${p.id}/`,
    title: `${p.name} - case study`,
    description: describe(`${p.name}: ${p.tagline} ${p.numbers.slice(0, 2).join(", ")}. Built by ${profile.name}.`),
    image: `/og/${p.id}.png`,
  });
}

export default async function ProjectPage(props: Props) {
  const { slug } = await props.params;
  const p = projectById(slug);
  // Case studies belong to the job persona only.
  if (!p || !(await currentPersona()).compiled.doc.legacy) notFound();
  const path = `/projects/${p.id}/`;
  const trail = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects/" },
    { name: p.name, path },
  ];
  const others = projects.filter((o) => o.id !== p.id).slice(0, 3);

  return (
    <>
      <JsonLd data={graph(webPageLd(path, `${p.name} - ${profile.name}`, p.tagline), breadcrumbLd(trail), projectLd(p))} />
      <Breadcrumbs trail={trail} />

      <article>
        <header className="mb-10">
          <p className="eyebrow">
            {p.kind} · {p.year}
          </p>
          <h1 className="display mt-3 text-4xl md:text-5xl">{p.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{p.tagline}</p>
        </header>

        <section aria-labelledby="problem" className="mb-10">
          <h2 id="problem" className="display text-2xl">
            The problem
          </h2>
          <p className="mt-3 leading-relaxed">{p.problem}</p>
        </section>

        <section aria-labelledby="built" className="mb-10">
          <h2 id="built" className="display text-2xl">
            What I built
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed marker:text-accent">
            {p.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="numbers" className="mb-10">
          <h2 id="numbers" className="display text-2xl">
            In numbers
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.numbers.map((n) => (
              <li key={n} className="card px-3 py-2 text-sm font-semibold">
                {n}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="stack" className="mb-10">
          <h2 id="stack" className="display text-2xl">
            Stack
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {p.stack.map((s) => (
              <li key={s} className="tag">
                {s}
              </li>
            ))}
          </ul>
        </section>

        {p.link && (
          <a href={p.link.href} target="_blank" rel="noreferrer" className="btn btn-ghost">
            <Github className="size-4" /> {p.link.label}
          </a>
        )}
      </article>

      <aside aria-labelledby="more" className="mt-14 border-t border-line pt-8">
        <h2 id="more" className="display text-xl">
          More projects
        </h2>
        <ul className="mt-4 space-y-3">
          {others.map((o) => (
            <li key={o.id}>
              <Link href={`/projects/${o.id}/`} className="font-semibold underline-offset-4 hover:underline">
                {o.name}
              </Link>
              <span className="text-muted"> - {o.tagline}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/projects/" className="font-semibold underline-offset-4 hover:underline">
            All projects
          </Link>{" "}
          · <Link href={`/ask/project-${p.id}/`} className="font-semibold underline-offset-4 hover:underline">Ask about it in the chat</Link>
        </p>
      </aside>
    </>
  );
}
