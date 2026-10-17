"use client";

import { BarChart3, Eye, MessageCircleQuestion, ShieldCheck, Users } from "lucide-react";
import type { AnalyticsSummary } from "@/server/admin-view";
import { cn } from "@/lib/utils";

function Bars({ title, rows, total, empty }: { title: string; rows: [string, number][]; total: number; empty: string }) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map(([label, n]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{label}</span>
                <span className="shrink-0 text-muted tabular-nums">
                  {n} <span className="text-faint">· {Math.round((n / total) * 100)}%</span>
                </span>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-strong">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / rows[0][1]) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Renders totals added up on the server (src/server/admin-view.ts); no raw events reach the browser. */
export function Analytics({ data }: { data: AnalyticsSummary }) {
  const maxDay = Math.max(1, ...data.days.map((d) => d.n));
  const kpis = [
    { icon: Eye, label: "Visits", value: data.views, tone: "text-sky-700 dark:text-sky-400 bg-sky-500/12" },
    { icon: MessageCircleQuestion, label: "Questions asked", value: data.asks, tone: "text-accent bg-accent-soft" },
    { icon: Users, label: "Known visitors", value: data.unique, tone: "text-violet-700 dark:text-violet-400 bg-violet-500/12" },
    { icon: ShieldCheck, label: "Accepted analytics", value: data.consentRate === null ? "-" : `${data.consentRate}%`, tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.label} className="card flex items-center gap-3 p-4">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", k.tone)}>
              <k.icon className="size-5" />
            </span>
            <span>
              <span className="display block text-2xl tabular-nums">{k.value}</span>
              <span className="block text-xs leading-snug text-muted">{k.label}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="card p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="size-4 text-faint" /> Visits, last 14 days
          </h2>
          <span className="text-xs text-faint">UTC</span>
        </div>
        <div className="mt-4 flex h-36 items-end gap-1.5" role="img" aria-label={`Visits per day: ${data.days.map((d) => `${d.label} ${d.n}`).join(", ")}`}>
          {data.days.map((d) => (
            <div key={d.key} className="group flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.n}`}>
              <span className="mb-1 text-center text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100">{d.n}</span>
              <span className={cn("block rounded-md", d.n ? "bg-accent/80 group-hover:bg-accent" : "bg-surface-strong")} style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-faint">
          <span>{data.days[0].label}</span>
          <span>{data.days[data.days.length - 1].label}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars title="Top questions" rows={data.questions} total={Math.max(1, data.asks)} empty="No questions asked yet." />
        <Bars title="Where visitors come from" rows={data.sources} total={Math.max(1, data.consentedCount)} empty="Shown once visitors accept analytics." />
        <Bars title="Browsers" rows={data.browsers} total={Math.max(1, data.consentedCount)} empty="Shown once visitors accept analytics." />
        <Bars title="Devices" rows={data.os} total={Math.max(1, data.consentedCount)} empty="Shown once visitors accept analytics." />
        <Bars title="Timezones" rows={data.timezones} total={Math.max(1, data.consentedCount)} empty="Shown once visitors accept analytics." />
      </div>
      <p className="text-xs text-faint">
        Visits and questions are counted for everyone, anonymously. Known visitors and device details come only from visitors who accepted analytics.
      </p>
    </div>
  );
}
