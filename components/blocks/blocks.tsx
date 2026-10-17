"use client";

import Image from "next/image";
import { IntentLink } from "@/components/chat/intent-link";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  UserRoundPlus,
} from "lucide-react";
import { Github, Linkedin } from "@/components/brand-icons";
import { ContactForm, FeedbackForm } from "./forms";
import { PrivacyChoice } from "@/components/consent";
import { cloud, education, farewell, farewellCard, languages, quotes, siteStack, skills } from "@/content/details";
import { experience } from "@/content/experience";
import { beliefs } from "@/content/intro";
import { profile } from "@/content/profile";
import { projectById, projects } from "@/content/projects";
import { usePersona } from "@/lib/persona/context";
import { QIcon } from "@/lib/persona/icons";
import type { Block } from "@/lib/persona/types";
import { cn } from "@/lib/utils";
import { RequestAccess } from "./request-access";
import { SectionBlock } from "./section-block";

type Ask = (intentId: string) => void;

export function BlockView({ block, onAsk }: { block: Block; onAsk: Ask }) {
  switch (block.kind) {
    case "stats":
      return <Stats />;
    case "focus":
      return <Focus />;
    case "beliefs":
      return <Beliefs />;
    case "privacy":
      return <PrivacyChoice />;
    case "experience":
      return <Experience />;
    case "projects":
      return <ProjectGrid onAsk={onAsk} />;
    case "project":
      return <ProjectDetail id={block.id} />;
    case "skills":
      return <Skills />;
    case "cloud":
      return <CloudList />;
    case "education":
      return <Education />;
    case "languages":
      return <LanguageBars />;
    case "contact":
      return <ContactCard />;
    case "hire":
      return <HireMe />;
    case "download":
      return <DownloadCard />;
    case "quotes":
      return <Quotes />;
    case "stack":
      return <SiteStack />;
    case "suggest":
      return <Suggest onAsk={onAsk} />;
    case "contact-form":
      return <ContactForm />;
    case "feedback-form":
      return <FeedbackForm />;
    case "section":
      return <SectionBlock sectionKey={block.key} />;
    case "request-access":
      return <RequestAccess />;
  }
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked - the visible text can still be selected */
    }
  };
  return { copied, copy };
}

const Tags = ({ items, className }: { items: readonly string[]; className?: string }) => (
  <ul className={cn("flex flex-wrap gap-1.5", className)}>
    {items.map((s) => (
      <li key={s} className="inline-flex items-center rounded-full border border-line-strong bg-bg-soft px-2.5 py-1 text-xs font-semibold text-fg">
        {s}
      </li>
    ))}
  </ul>
);

function Stats() {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {profile.stats.map((s) => (
        <li key={s.label} data-gs="pop" className="card p-4 md:p-5">
          <div data-gs="count" className="display text-4xl tabular-nums md:text-[2.6rem]">{s.value}</div>
          <div className="mt-2 text-sm leading-snug text-muted">{s.label}</div>
        </li>
      ))}
    </ul>
  );
}

function Focus() {
  return (
    <ul className="card divide-y divide-line">
      {profile.focus.map((f) => (
        <li key={f.area} data-gs="row" className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-5 md:px-5">
          <span className="shrink-0 font-semibold sm:w-36">{f.area}</span>
          <span className="text-[15px] leading-relaxed text-muted">{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Beliefs() {
  return (
    <ul className="card divide-y divide-line">
      {beliefs.map((b) => (
        <li key={b} data-gs="row" className="px-5 py-4 font-serif text-[1.3rem] leading-snug md:px-6 md:text-[1.45rem]">
          &ldquo;{b}&rdquo;
        </li>
      ))}
    </ul>
  );
}

function Experience() {
  return (
    <ol className="relative space-y-8 pl-6 md:pl-8">
      <span data-gs="line" aria-hidden="true" className="absolute top-1 bottom-1 left-0 w-px bg-line" />
      {experience.map((job) => (
        <li key={job.company} className="relative">
          <span data-gs="dot" className="absolute top-2 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-bg md:-left-[37px]" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="display text-2xl md:text-[1.7rem]">{job.company}</h3>
            <span className="text-sm font-medium text-faint">{job.period}</span>
          </div>
          <p className="mt-1 font-semibold">
            {job.role} {job.location && <span className="font-normal text-muted">· {job.location}</span>}
          </p>
          {job.context && <p className="text-sm text-muted">{job.context}</p>}
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed marker:text-faint">
            {job.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {job.engagements && (
            <div className="mt-5 space-y-3">
              {job.engagements.map((e) => (
                <details key={e.title} data-gs="row" className="group border-l-2 border-line pl-4 open:border-accent/60 md:pl-5">
                  <summary className="flex cursor-pointer items-start justify-between gap-3 rounded-lg py-2 pr-1">
                    <div className="min-w-0">
                      <div className="text-[17px] font-semibold">{e.title}</div>
                      <div className="text-sm text-muted">
                        {e.role} · {e.period}
                      </div>
                    </div>
                    <ChevronDown className="mt-1 size-5 shrink-0 text-faint transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pt-1 pb-3">
                    <ul className="list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed marker:text-faint">
                      {e.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    {e.stack && <Tags items={e.stack} className="mt-3" />}
                  </div>
                </details>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function ProjectGrid({ onAsk }: { onAsk: Ask }) {
  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <IntentLink
          key={p.id}
          intentId={`project-${p.id}`}
          onPick={onAsk}
          aria-label={`${p.name}: read the full story`}
          data-gs="row"
          className="card group flex w-full items-start gap-4 p-5 text-left transition-colors hover:border-surface-strong hover:bg-bg-soft md:p-6"
        >
          <Image
            src={`/og/${p.id}.png`}
            alt={`${p.name} project cover`}
            width={1200}
            height={630}
            className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover sm:h-20 sm:w-32"
          />
          <div className="min-w-0 flex-1">
            <div className="eyebrow flex flex-wrap items-center gap-x-2">
              <span className={cn(p.kind === "Open source" && "text-accent")}>{p.kind}</span>
              <span aria-hidden="true">·</span>
              <span>{p.year}</span>
            </div>
            <h3 className="display mt-2 text-[1.5rem] md:text-[1.7rem]">{p.name}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted md:text-base">{p.tagline}</p>
            <div className="mt-3">
              <Figures items={p.numbers.slice(0, 3)} />
            </div>
            <Tags items={p.stack.slice(0, 6)} className="mt-3" />
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-faint transition-colors group-hover:border-surface-strong group-hover:text-fg">
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </IntentLink>
      ))}
    </div>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const p = projectById(id);
  if (!p) return null;
  return (
    <article className="card overflow-hidden">
      <Image
        src={`/og/${p.id}.png`}
        alt={`${p.name} project cover`}
        width={1200}
        height={630}
        className="aspect-[1.91/1] w-full border-b border-line object-cover"
      />
      <header className="border-b border-line bg-bg-soft p-5 md:p-6">
        <div className="eyebrow">
          {p.kind} · {p.year}
        </div>
        <h3 className="display mt-2 text-3xl md:text-4xl">{p.name}</h3>
        <p className="mt-2 text-muted">{p.problem}</p>
      </header>
      <div className="space-y-5 p-5 md:p-6">
        <div>
          <div className="eyebrow mb-2">What I built</div>
          <ul className="list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed marker:text-accent">
            {p.built.map((b) => (
              <li key={b} data-gs="row">
                {b}
              </li>
            ))}
          </ul>
        </div>
        <Figures items={p.numbers} />
        <Tags items={p.stack} />
        {p.link && (
          <a href={p.link.href} target="_blank" rel="noreferrer" className="btn btn-ghost">
            <Github className="size-4" /> {p.link.label}
          </a>
        )}
      </div>
    </article>
  );
}

/** "~29k lines of code" → **~29k** lines of code, joined with dots. Each dot ends the item before it, so no line starts with one. */
function Figures({ items }: { items: readonly string[] }) {
  return (
    // Separators are drawn by .dot-list (CSS) so one never dangles at the end or start of a line.
    <p className="dot-list text-[15px] text-muted">
      {items.map((n) => {
        const [head, ...rest] = n.split(" ");
        const numeric = /\d/.test(head);
        return (
          <span key={n}>
            {numeric ? (
              <>
                <span className="font-semibold text-fg">{head}</span>
                {" "}
                {rest.join(" ")}
              </>
            ) : (
              <span className="font-semibold text-fg">{n}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function Skills() {
  return (
    <div className="card divide-y divide-line">
      {skills.map((g) => (
        <section key={g.group} data-gs="row" className="flex flex-col gap-2.5 p-4 sm:flex-row sm:gap-5 md:px-5">
          <h3 className="shrink-0 text-[15px] font-semibold sm:w-36 sm:pt-0.5">{g.group}</h3>
          <Tags items={g.items} />
        </section>
      ))}
    </div>
  );
}

function CloudList() {
  return (
    <ul className="card divide-y divide-line">
      {cloud.map((c) => (
        <li key={c.name} data-gs="row" className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 md:px-5">
          <span className="font-semibold sm:w-56 sm:shrink-0">{c.name}</span>
          <span className="text-[15px] text-muted">{c.where}</span>
        </li>
      ))}
    </ul>
  );
}

function Education() {
  return (
    <div className="space-y-3">
      <article className="card p-5 md:p-6">
        <div className="eyebrow">
          {education.year} · {education.location}
        </div>
        <h3 className="display mt-2 text-2xl md:text-3xl">{education.degree}</h3>
        <p className="mt-1 font-semibold text-muted">{education.school}</p>
        <p className="mt-4 text-[16px]">
          <span className="font-semibold">Capstone: </span>
          {education.capstone}
        </p>
      </article>
      <div className="card p-5 md:p-6">
        <div className="eyebrow mb-3">Continued learning</div>
        <Tags items={education.courses} />
      </div>
    </div>
  );
}

function LanguageBars() {
  return (
    <ul className="card divide-y divide-line">
      {languages.map((l) => (
        <li key={l.name} data-gs="row" className="flex items-center justify-between gap-4 p-4 md:p-5">
          <div>
            <div className="text-lg font-semibold">{l.name}</div>
            <div className="text-sm text-muted">{l.level}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1" aria-label={`${l.score} of 6`}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} data-gs="bar" className={cn("h-2 w-5 rounded-full md:w-7", i < l.score ? "bg-fg" : "bg-surface-strong")} />
              ))}
            </div>
            <span className="w-14 text-right text-sm font-semibold">{l.cefr}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function downloadVCard() {
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `TITLE:${profile.role}`,
    `EMAIL;TYPE=INTERNET:${profile.email}`,
    `TEL;TYPE=CELL:${profile.phoneHref.replace("tel:", "")}`,
    "ADR;TYPE=HOME:;;;Dhaka;;;Bangladesh",
    `URL:${profile.links.linkedin}`,
    `URL:${profile.links.github}`,
    "END:VCARD",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "Maruf-Billah.vcf" });
  a.click();
  URL.revokeObjectURL(url);
}

function ContactCard() {
  const { copied, copy } = useCopy();
  const rows = [
    { key: "email", icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}`, copy: true },
    { key: "phone", icon: Phone, label: "Phone / WhatsApp", value: profile.phone, href: profile.phoneHref, copy: true },
    { key: "linkedin", icon: Linkedin, label: "LinkedIn", value: "marufbillah1020", href: profile.links.linkedin },
    { key: "github", icon: Github, label: "GitHub", value: "maruf1020", href: profile.links.github },
    { key: "loc", icon: MapPin, label: "Location", value: profile.location },
  ];
  return (
    <div className="space-y-3">
      <ul className="card divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} data-gs="row" className="flex items-center gap-3 px-4 py-3 md:px-5">
            <r.icon className="size-5 shrink-0 text-faint" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-faint">{r.label}</div>
              {r.href ? (
                <a
                  href={r.href}
                  target={r.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  // Phones: a taller hit area (py-2.5 -my-2.5) without moving the layout.
                  className="-my-2.5 block truncate py-2.5 font-semibold hover:underline"
                >
                  {r.value}
                </a>
              ) : (
                <div className="font-semibold">{r.value}</div>
              )}
            </div>
            {r.copy && (
              <button type="button" className="icon-btn" onClick={() => copy(r.key, r.value)} aria-label={`Copy ${r.label}`}>
                {copied === r.key ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={downloadVCard} className="btn btn-ghost">
        <UserRoundPlus className="size-4" /> Save contact (.vcf)
      </button>
    </div>
  );
}

function HireMe() {
  const { document: doc, fileHref } = usePersona();
  const subject = encodeURIComponent("Opportunity for Maruf");
  return (
    <div className="card overflow-hidden">
      <div className="grid gap-px bg-line sm:grid-cols-2">
        {profile.hire.lookingFor.map((x) => (
          <div key={x.k} data-gs="pop" className="bg-card p-4 md:p-5">
            <div className="eyebrow">{x.k}</div>
            <div className="mt-1.5 text-[15px] leading-snug font-semibold">{x.v}</div>
            <div className="mt-1 text-sm leading-snug text-muted">{x.note}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="eyebrow px-4 pt-4 md:px-5">What I bring</div>
        <dl className="divide-y divide-line">
          {profile.hire.strengths.map((x) => (
            <div key={x.k} data-gs="row" className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-5 md:px-5">
              <dt className="shrink-0 text-sm font-semibold sm:w-44">{x.k}</dt>
              <dd className="text-[15px] leading-relaxed text-muted">{x.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-4 md:p-5">
        <a href={`mailto:${profile.email}?subject=${subject}`} className="btn btn-primary">
          <Mail className="size-4" /> Email me
        </a>
        <a href={profile.phoneHref} className="btn btn-ghost" aria-label={`Call ${profile.phone}`}>
          <Phone className="size-4" /> Call me
        </a>
        {doc.pdfUrl && (
          <a href={fileHref(doc.pdfUrl)} download className="btn btn-ghost">
            <Download className="size-4" /> {doc.download}
          </a>
        )}
        <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost">
          <Linkedin className="size-4" /> LinkedIn
        </a>
      </div>
    </div>
  );
}

function DownloadCard() {
  const { document: doc, fileHref, href, labels, legacy } = usePersona();
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FileText className="size-7" />
        </div>
        <div>
          <div className="font-semibold">{doc.pdfUrl ? doc.fileName : doc.label}</div>
          <div className="text-sm text-muted">
            {doc.pdfUrl ? "PDF · " : ""}
            {doc.language}
            {doc.updated ? ` · Updated ${doc.updated}` : ""}
          </div>
        </div>
      </div>
      <div className="flex gap-2 sm:ml-auto">
        {doc.pdfUrl && (
          <a href={fileHref(doc.pdfUrl)} download className="btn btn-primary">
            <Download className="size-4" /> {legacy ? "Download" : labels.documentDownload}
          </a>
        )}
        <a href={href(doc.pageUrl)} className={doc.pdfUrl ? "btn btn-ghost" : "btn btn-primary"}>
          {doc.open ? labels.documentWeb : labels.requestAccess}
        </a>
      </div>
    </div>
  );
}

const initialsOf = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function QuoteCard({ q }: { q: (typeof quotes)[number] }) {
  const [open, setOpen] = useState(false);
  const longer = q.text.trim() !== q.highlight.trim();
  return (
    <figure data-gs="row" className="card p-5 md:p-6">
      <blockquote className="font-serif text-[1.35rem] leading-[1.35] md:text-[1.6rem]">&ldquo;{q.highlight}&rdquo;</blockquote>
      {open && (
        <div className="mt-4 space-y-3 border-l-2 border-line pl-4 text-[15px] leading-relaxed text-muted">
          {q.text.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>
      )}
      <figcaption className="mt-5 flex flex-wrap items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-sm font-semibold">{initialsOf(q.name)}</span>
        <span className="min-w-0 flex-1 text-sm leading-snug">
          <span className="block font-semibold">{q.name}</span>
          <span className="text-muted">{q.title}</span>
          <span className="block text-faint">
            {q.relation} · {q.date}
          </span>
        </span>
        <span className="flex items-center gap-3 text-sm font-semibold">
          {longer && (
            <button type="button" className="inline-flex items-center text-muted underline-offset-4 hover:text-fg hover:underline pointer-coarse:min-h-11" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Show less" : "Read full"}
            </button>
          )}
          <a
            href={profile.links.linkedinRecommendations}
            target="_blank"
            rel="noreferrer"
            className="icon-btn size-9"
            aria-label={`See ${q.name}'s recommendation on LinkedIn`}
            title="See on LinkedIn"
          >
            <Linkedin className="size-4" />
          </a>
        </span>
      </figcaption>
    </figure>
  );
}

function Quotes() {
  const [all, setAll] = useState(false);
  const shown = all ? quotes : quotes.slice(0, 4);
  if (quotes.length === 0 && farewell.length === 0) {
    return (
      <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost">
        View my LinkedIn profile <ArrowUpRight className="size-4" />
      </a>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="eyebrow">{quotes.length} recommendations on LinkedIn</span>
        <a
          href={profile.links.linkedinRecommendations}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline pointer-coarse:min-h-11"
        >
          <Linkedin className="size-3.5" /> See all on LinkedIn <ArrowUpRight className="size-3.5" />
        </a>
      </div>
      {shown.map((q) => (
        <QuoteCard key={q.name} q={q} />
      ))}
      {!all && (
        <button type="button" className="btn btn-ghost" onClick={() => setAll(true)}>
          Show all {quotes.length} recommendations
        </button>
      )}
      <Farewell />
    </div>
  );
}

function Farewell() {
  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-soft px-5 py-4 md:px-6">
        <div>
          <div className="eyebrow">{farewell.length} notes from my team</div>
          <div className="mt-1 font-semibold">{farewellCard.title}</div>
        </div>
        <a href={farewellCard.url} target="_blank" rel="noreferrer" className="btn btn-ghost bg-card py-2 text-sm pointer-coarse:min-h-11">
          See the original <ArrowUpRight className="size-4" />
        </a>
      </header>
      <ul className="divide-y divide-line">
        {farewell.map((n) => (
          <li key={n.name} data-gs="row" className="px-5 py-4 md:px-6">
            <p className="font-serif text-[1.2rem] leading-snug md:text-[1.35rem]">&ldquo;{n.text}&rdquo;</p>
            <p className="mt-2 text-sm font-semibold">{n.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SiteStack() {
  return (
    <div className="card space-y-4 p-5 md:p-6">
      <Tags items={siteStack} />
      <p className="text-[15px] text-muted">
        Every listed answer lives in a typed content file; the &ldquo;chat&rdquo; matches what you pick or type against them, so those
        can&rsquo;t be made up. A question none of them covers goes to Google&rsquo;s Gemini with the same CV text as its only source, and
        comes back labelled as an AI answer.
      </p>
    </div>
  );
}

function Suggest({ onAsk }: { onAsk: Ask }) {
  const { primary } = usePersona();
  return (
    <div className="flex flex-wrap gap-2">
      {primary.slice(0, 8).map((i) => (
        <IntentLink key={i.id} intentId={i.id} onPick={onAsk} className="chip">
          <QIcon name={i.icon} className="size-4 text-faint" /> {i.label}
        </IntentLink>
      ))}
    </div>
  );
}
