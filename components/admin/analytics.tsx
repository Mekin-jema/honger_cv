"use client";

import { Activity, ArrowUpRight, BarChart3, Eye, Globe2, MessageCircleQuestion, Monitor, ShieldCheck, Users } from "lucide-react";
import type { AnalyticsSummary } from "@/server/admin-view";
import { cn } from "@/lib/utils";

function Bars({
  title,
  rows,
  total,
  empty,
  icon: Icon,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  empty: string;
  icon: typeof Globe2;
}) {
  const peak = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <section className="card min-w-0 overflow-hidden p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="text-xs text-faint">Top {rows.length || 5}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-bg-soft/60 px-4 py-6 text-center">
          <p className="text-sm font-medium text-muted">{empty}</p>
        </div>
      ) : (
        <ol className="mt-5 space-y-4">
          {rows.map(([label, count], index) => (
            <li key={label} className="flex items-center gap-3">
              <span className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold tabular-nums",
                index === 0 ? "bg-accent-soft text-accent" : "bg-bg-soft text-faint",
              )}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {count} <span className="text-faint">· {Math.round((count / Math.max(1, total)) * 100)}%</span>
                  </span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-strong">
                  <span
                    className={cn("block h-full rounded-full", index === 0 ? "bg-accent" : "bg-accent/55")}
                    style={{ width: `${Math.max(3, (count / peak) * 100)}%` }}
                  />
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Renders totals added up on the server (src/server/admin-view.ts); no raw events reach the browser. */
export function Analytics({ data }: { data: AnalyticsSummary }) {
  const maxDay = Math.max(1, ...data.days.map((d) => d.n));
  const recentViews = data.days.reduce((sum, day) => sum + day.n, 0);
  const peakDay = Math.max(0, ...data.days.map((day) => day.n));
  const kpis = [
    { icon: Eye, label: "Total visits", value: data.views, note: "Across all visitors", tone: "text-sky-700 dark:text-sky-400 bg-sky-500/12" },
    { icon: MessageCircleQuestion, label: "Questions asked", value: data.asks, note: "Chat engagement", tone: "text-accent bg-accent-soft" },
    { icon: Users, label: "Known visitors", value: data.unique, note: "Consented visitors", tone: "text-violet-700 dark:text-violet-400 bg-violet-500/12" },
    { icon: ShieldCheck, label: "Analytics consent", value: data.consentRate === null ? "-" : `${data.consentRate}%`, note: "Visitors who opted in", tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12" },
  ];

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-7">
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-card via-card to-accent-soft/70 p-5 md:p-7">
        <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 size-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              <Activity className="size-3.5 text-accent" /> Privacy-first insights
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">Analytics overview</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              A clear picture of portfolio traffic and what visitors want to know.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/75 px-3 py-2 text-xs font-medium text-muted">
            <BarChart3 className="size-4 text-accent" />
            Last 14 days
          </div>
        </div>
      </section>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.label} className="card group relative overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-0.5 md:p-5">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent/80 via-accent/30 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-muted">{k.label}</span>
                <span className="display mt-3 block text-3xl tabular-nums md:text-4xl">{k.value}</span>
                <span className="mt-1.5 block text-xs text-faint">{k.note}</span>
              </div>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105", k.tone)}>
                <k.icon className="size-5" />
              </span>
            </div>
          </li>
        ))}
      </ul>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 md:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="size-4 text-accent" /> Traffic over time
            </h2>
            <p className="mt-1 text-xs text-muted">Daily page views · UTC</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-semibold tabular-nums">{recentViews}</p>
              <p className="text-[11px] text-faint">visits in range</p>
            </div>
            <span className="hidden h-9 w-px bg-line sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-xl font-semibold tabular-nums">{peakDay}</p>
              <p className="text-[11px] text-faint">peak day</p>
            </div>
          </div>
        </div>
        <div className="relative px-4 pb-4 pt-6 md:px-6 md:pb-5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-7 bottom-10 flex flex-col justify-between md:inset-x-6">
            {[0, 1, 2].map((line) => <span key={line} className="border-t border-dashed border-line/80" />)}
          </div>
          <div className="relative flex h-44 items-end gap-1.5 sm:gap-2 md:h-52" role="img" aria-label={`Visits per day: ${data.days.map((d) => `${d.label} ${d.n}`).join(", ")}`}>
            {data.days.map((d, index) => (
              <div key={d.key} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.n}`}>
                <span className="pointer-events-none absolute bottom-full mb-2 rounded-md border border-line bg-card px-2 py-1 text-[10px] font-semibold tabular-nums text-fg opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {d.n}
                </span>
                <span
                  className={cn(
                    "relative z-10 block w-full max-w-8 rounded-t-md transition-[height,filter] duration-300 group-hover:brightness-110",
                    d.n ? "bg-gradient-to-t from-accent to-accent/65" : "bg-surface-strong/70",
                    index === data.days.length - 1 && d.n > 0 && "ring-1 ring-accent/30 ring-offset-2 ring-offset-card",
                  )}
                  style={{ height: `${Math.max(3, (d.n / maxDay) * 100)}%` }}
                  aria-label={`${d.label}: ${d.n} visits`}
                />
                <span className="mt-2 h-4 text-center text-[9px] text-faint sm:text-[10px]">
                  {index === 0 || index === data.days.length - 1 || index % 3 === 0 ? d.label : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Bars icon={MessageCircleQuestion} title="What visitors ask" rows={data.questions} total={Math.max(1, data.asks)} empty="Questions will appear here as visitors explore the chat." />
        <Bars icon={Globe2} title="Traffic sources" rows={data.sources} total={Math.max(1, data.consentedCount)} empty="Source details appear after visitors accept analytics." />
        <Bars icon={Monitor} title="Browsers" rows={data.browsers} total={Math.max(1, data.consentedCount)} empty="Browser details appear after visitors accept analytics." />
        <Bars icon={Monitor} title="Operating systems" rows={data.os} total={Math.max(1, data.consentedCount)} empty="Device details appear after visitors accept analytics." />
        <Bars icon={ArrowUpRight} title="Time zones" rows={data.timezones} total={Math.max(1, data.consentedCount)} empty="Time zones appear after visitors accept analytics." />
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-line bg-bg-soft/60 px-4 py-3 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        Visits and questions are counted for everyone, anonymously. Known visitors and device details come only from visitors who accepted analytics.
      </p>
    </div>
  );
}
