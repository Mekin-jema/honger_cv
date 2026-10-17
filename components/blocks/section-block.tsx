"use client";

import { ChevronDown } from "lucide-react";
import { RichText } from "@/components/chat/rich-text";
import { usePersona } from "@/lib/persona/context";
import type { ClientItem, ClientSection } from "@/lib/persona/types";
import { cn } from "@/lib/utils";

/**
 * A persona's knowledge section as a chat card, drawn by its display type. Only items the visitor may
 * see ever reach the browser (the server filters by tier), so there is nothing to hide here.
 * Uses the same card styles and data-gs animation hooks as the hand-built cards in blocks.tsx.
 */
export function SectionBlock({ sectionKey }: { sectionKey: string }) {
  const { section } = usePersona();
  const s = section(sectionKey);
  if (!s || !s.items.length) return null;
  return (
    <section aria-label={s.title} className="space-y-2">
      <div className="eyebrow px-1">{s.title}</div>
      <SectionBody s={s} />
    </section>
  );
}

/** A section's items drawn by display type (also used by the persona's public pages). */
export function SectionBody({ s }: { s: ClientSection }) {
  switch (s.display) {
    case "facts":
      return <Facts items={s.items} />;
    case "paragraphs":
      return <Paragraphs items={s.items} />;
    case "list":
      return <List items={s.items} />;
    case "timeline":
      return <Timeline items={s.items} />;
    case "tags":
      return <TagGroups items={s.items} />;
    case "gallery":
      return <Gallery items={s.items} />;
    case "quotes":
      return <Quotes items={s.items} />;
  }
}

const Tags = ({ items, className }: { items: string[]; className?: string }) => (
  <ul className={cn("flex flex-wrap gap-1.5", className)}>
    {items.map((t) => (
      <li key={t} className="tag">
        {t}
      </li>
    ))}
  </ul>
);

const Text = ({ text }: { text: string }) => (
  <>
    {text.split(/\n{2,}/).map((para, i) => (
      <p key={i} className={cn(i > 0 && "mt-3")}>
        <RichText text={para} />
      </p>
    ))}
  </>
);

function Facts({ items }: { items: ClientItem[] }) {
  return (
    <dl className="card divide-y divide-line">
      {items.map((it) => (
        <div key={it.id} data-gs="row" className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-5 md:px-5">
          <dt className="shrink-0 text-sm font-semibold sm:w-44">{it.label}</dt>
          <dd className="text-[15px] leading-relaxed text-muted">
            <RichText text={it.value ?? it.text ?? ""} />
            {it.meta && <span className="block text-sm text-faint">{it.meta}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Paragraphs({ items }: { items: ClientItem[] }) {
  return (
    <div className="card space-y-5 p-5 text-[16px] leading-relaxed md:p-6">
      {items.map((it) => (
        <div key={it.id} data-gs="row">
          {it.label && <h4 className="mb-1.5 font-semibold">{it.label}</h4>}
          <Text text={it.text ?? it.value ?? ""} />
        </div>
      ))}
    </div>
  );
}

function List({ items }: { items: ClientItem[] }) {
  return (
    <ul className="card divide-y divide-line">
      {items.map((it) => (
        <li key={it.id} data-gs="row" className="px-5 py-3.5 text-[16px] leading-relaxed md:px-6">
          {it.label && <span className="font-semibold">{it.label}: </span>}
          <RichText text={it.text ?? it.value ?? ""} />
        </li>
      ))}
    </ul>
  );
}

function Timeline({ items }: { items: ClientItem[] }) {
  return (
    <ol className="relative space-y-7 pl-6 md:pl-8">
      <span data-gs="line" aria-hidden="true" className="absolute top-1 bottom-1 left-0 w-px bg-line" />
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span data-gs="dot" className="absolute top-2 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-bg md:-left-[37px]" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="display text-xl md:text-2xl">{it.label}</h3>
            {it.period && <span className="text-sm font-medium text-faint">{it.period}</span>}
          </div>
          {it.meta && <p className="mt-1 text-[15px] font-semibold text-muted">{it.meta}</p>}
          {(it.text || it.value) && (
            <div className="mt-2 text-[16px] leading-relaxed">
              <Text text={it.text ?? it.value ?? ""} />
            </div>
          )}
          {it.details && it.details.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed marker:text-faint">
              {it.details.map((d) => (
                <li key={d}>
                  <RichText text={d} />
                </li>
              ))}
            </ul>
          )}
          {it.sub && it.sub.length > 0 && (
            <div className="mt-4 space-y-3">
              {it.sub.map((sub) => (
                <details key={sub.title} data-gs="row" className="group border-l-2 border-line pl-4 open:border-accent/60 md:pl-5">
                  <summary className="flex cursor-pointer items-start justify-between gap-3 rounded-lg py-2 pr-1">
                    <div className="min-w-0">
                      <div className="text-[17px] font-semibold">{sub.title}</div>
                      <div className="text-sm text-muted">{[sub.meta, sub.period].filter(Boolean).join(" · ")}</div>
                    </div>
                    <ChevronDown className="mt-1 size-5 shrink-0 text-faint transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="list-disc space-y-1.5 pt-1 pb-3 pl-5 text-[16px] leading-relaxed marker:text-faint">
                    {sub.details.map((d) => (
                      <li key={d}>
                        <RichText text={d} />
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
          {it.tags && it.tags.length > 0 && <Tags items={it.tags} className="mt-3" />}
        </li>
      ))}
    </ol>
  );
}

function TagGroups({ items }: { items: ClientItem[] }) {
  return (
    <div className="card divide-y divide-line">
      {items.map((it) => (
        <section key={it.id} data-gs="row" className="flex flex-col gap-2.5 p-4 sm:flex-row sm:gap-5 md:px-5">
          {it.label && <h3 className="shrink-0 text-[15px] font-semibold sm:w-36 sm:pt-0.5">{it.label}</h3>}
          <Tags items={it.tags ?? []} />
        </section>
      ))}
    </div>
  );
}

function Gallery({ items }: { items: ClientItem[] }) {
  const { fileHref } = usePersona();
  const shown = items.filter((it) => it.src);
  return (
    <ul className={cn("grid gap-3", shown.length > 1 && "grid-cols-2")}>
      {shown.map((it) => (
        <li key={it.id} data-gs="pop" className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileHref(it.src!)}
            alt={it.label ?? it.text ?? ""}
            width={it.width}
            height={it.height}
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] w-full object-cover"
          />
          {(it.label || it.text) && <p className="px-3 py-2 text-sm text-muted">{it.label ?? it.text}</p>}
        </li>
      ))}
    </ul>
  );
}

function Quotes({ items }: { items: ClientItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <figure key={it.id} data-gs="row" className="card p-5 md:p-6">
          <blockquote className="font-serif text-[1.25rem] leading-[1.4] md:text-[1.45rem]">&ldquo;{it.text ?? it.value}&rdquo;</blockquote>
          {(it.label || it.meta) && (
            <figcaption className="mt-4 text-sm leading-snug">
              {it.label && <span className="block font-semibold">{it.label}</span>}
              {it.meta && <span className="text-muted">{it.meta}</span>}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
