import { Activity, FileDown, LayoutTemplate, MessageSquareText, UserRound, Users } from "lucide-react";
import type { PlatformAnalytics, PlatformEventType } from "@/server/platform-events";
import { CV_TEMPLATES } from "@/lib/persona/cv-templates";

const labels: Record<PlatformEventType, string> = {
  profile_created: "Profiles created",
  draft_saved: "Draft saves",
  assistant_tested: "AI tests",
  publish_started: "Publish attempts",
  profile_published: "Profiles published",
  template_saved: "Designs selected",
  pdf_print_requested: "PDF exports requested",
};

export function PlatformAnalyticsPanel({ data }: { data: PlatformAnalytics }) {
  if (!data.ready) {
    return (
      <section className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-7" aria-labelledby="platform-analytics-heading">
        <h2 id="platform-analytics-heading" className="text-xl font-semibold">Platform analytics need a database migration</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Apply the customer-role and platform-analytics migrations to enable account metrics and event tracking.</p>
      </section>
    );
  }
  const cards = [
    { label: "Customer accounts", value: data.customers, icon: Users },
    { label: "Customer profiles", value: data.profiles, icon: UserRound },
    { label: "Published profiles", value: data.publishedProfiles, icon: Activity },
    { label: "PDF export requests", value: data.activity.pdf_print_requested, icon: FileDown },
  ];
  return (
    <section className="mb-8 space-y-5 rounded-2xl border border-line bg-card p-5 sm:p-7" aria-labelledby="platform-analytics-heading">
      <div>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><Activity className="size-4" aria-hidden="true" /> Platform</p>
        <h2 id="platform-analytics-heading" className="mt-2 text-2xl font-semibold tracking-tight">Customer activity</h2>
        <p className="mt-1 text-sm text-muted">Account and profile totals plus actions recorded by the platform.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-line bg-bg p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-muted">
              <span>{label}</span><Icon className="size-4 text-accent" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 inline-flex items-center gap-2 font-semibold"><MessageSquareText className="size-4" aria-hidden="true" /> Events</h3>
          <dl className="divide-y divide-line rounded-xl border border-line">
            {Object.entries(labels).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold tabular-nums">{data.activity[type as PlatformEventType].toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="mb-2 inline-flex items-center gap-2 font-semibold"><LayoutTemplate className="size-4" aria-hidden="true" /> Popular CV designs</h3>
          {data.popularTemplates.length ? (
            <ol className="space-y-2">
              {data.popularTemplates.map(({ template, count }) => (
                <li key={template} className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 text-sm">
                  <span>{CV_TEMPLATES.find((item) => item.id === template)?.name ?? template}</span>
                  <span className="font-semibold tabular-nums">{count.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          ) : <p className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">No design selections recorded yet.</p>}
        </div>
      </div>
    </section>
  );
}
