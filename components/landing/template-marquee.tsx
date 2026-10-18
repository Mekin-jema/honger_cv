"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles, CheckCircle2 } from "lucide-react";
import { TEMPLATE_ITEMS, type TemplateShowcaseItem } from "./landing-data";

function MarqueeCard({ item, accent = "#b5400f" }: { item: TemplateShowcaseItem; accent?: string }) {
  return (
    <Link
      href={`/cv/?template=${item.id}`}
      className="group relative flex w-[280px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-xl sm:w-[320px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] font-semibold text-muted">
            {item.categoryLabel}
          </span>
          <h4 className="mt-2 text-base font-bold tracking-tight text-fg group-hover:text-accent transition-colors">
            {item.name}
          </h4>
        </div>

        <span className="grid size-7 place-items-center rounded-xl bg-surface text-muted transition-colors group-hover:bg-accent group-hover:text-on-accent">
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      {/* Miniature preview art simulation */}
      <div className="my-3 overflow-hidden rounded-lg border border-line/80 bg-[#fffdfa] p-3 text-[9px] shadow-xs">
        <div className="flex items-center gap-2">
          <div
            className="size-5 rounded-md"
            style={{ backgroundColor: item.accentRecommended ?? accent }}
          />
          <div className="space-y-1 flex-1">
            <div className="h-2 w-3/4 rounded bg-fg/75" />
            <div className="h-1.5 w-1/2 rounded bg-muted/40" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-line/60 pt-2">
          <div className="h-1.5 rounded bg-muted/20" />
          <div className="h-1.5 rounded bg-muted/20" />
          <div className="h-1.5 rounded bg-muted/20" />
        </div>

        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full rounded bg-muted/15" />
          <div className="h-1.5 w-4/5 rounded bg-muted/15" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          ATS {item.atsScore}%
        </span>
        <span className="font-mono text-[10px] text-faint">{item.pages}</span>
      </div>
    </Link>
  );
}

export function TemplateMarquee() {
  const row1 = TEMPLATE_ITEMS.slice(0, 12);
  const row2 = TEMPLATE_ITEMS.slice(12, 25);

  return (
    <section className="relative overflow-hidden border-y border-line bg-bg-soft/40 py-16 sm:py-20">
      {/* Glow background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-accent/5 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
          <Sparkles className="size-3.5 text-accent" />
          Moving Showcase · 25+ Tailored Layouts
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Templates designed to pass every ATS and impress every hiring manager.
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-base text-muted sm:text-lg">
          Hover to pause and explore any design. Seamless vector PDF output calibrated for 1-page or 2-page formats.
        </p>
      </div>

      {/* Marquee Wrapper with Pause on Hover */}
      <div className="pause-on-hover relative mt-12 flex flex-col gap-6 overflow-hidden">
        {/* Left and Right Fade Gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent sm:w-32" />

        {/* Row 1: Leftward */}
        <div className="animate-marquee-left flex gap-5">
          {/* Double array for seamless infinite looping */}
          {[...row1, ...row1].map((item, idx) => (
            <MarqueeCard key={`row1-${item.id}-${idx}`} item={item} />
          ))}
        </div>

        {/* Row 2: Rightward */}
        <div className="animate-marquee-right flex gap-5">
          {[...row2, ...row2].map((item, idx) => (
            <MarqueeCard key={`row2-${item.id}-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
