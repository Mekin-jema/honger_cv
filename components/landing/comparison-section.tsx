import { Check, X, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

const COMPARISON_ROWS = [
  {
    feature: "25+ Signature Layouts & Palettes",
    honger: "Included free · 25+ templates with 12+ color palettes & custom hex",
    traditional: "Limited to 3 generic templates (paywall for rest)",
  },
  {
    feature: "ATS (Applicant Tracking) Parsing",
    honger: "Verified 99%+ pass rate on Greenhouse, Lever, and Workday",
    traditional: "Fails table parsing and mangles multi-column text",
  },
  {
    feature: "PDF Download Transparency",
    honger: "100% Free instant vector PDF download · No hidden charges",
    traditional: "Sneaky $29-$40/month auto-renewing subscriptions",
  },
  {
    feature: "Interactive Recruiter AI Assistant",
    honger: "Live conversational AI trained on your achievements & projects",
    traditional: "Static 2D paper only with zero interactivity",
  },
  {
    feature: "Print & Vector Rendering Fidelity",
    honger: "Pixel-perfect A4 calibration with zero page cut anomalies",
    traditional: "Chopped sentences, blurred rasterized fonts, awkward page splits",
  },
  {
    feature: "Privacy & Data Protection",
    honger: "Zero resume scraping · No ad trackers · You own your career data",
    traditional: "Sells resume data to third-party recruitment brokers",
  },
];

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
          <ShieldCheck className="size-3.5 text-accent" />
          The Honest Difference
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Why top candidates choose Honger CV over traditional builders.
        </h2>
        <p className="mt-4 text-base text-muted sm:text-lg">
          No surprise billing traps. No broken margins. Just world-class engineering for your career.
        </p>
      </div>

      <div className="mt-14 overflow-hidden rounded-3xl border border-line bg-card shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_1.4fr] border-b border-line bg-surface/70 text-xs font-bold uppercase tracking-wider text-muted">
          <div className="p-4 sm:p-5">Capability / Feature</div>
          <div className="flex items-center gap-2 bg-accent/10 p-4 text-accent sm:p-5">
            <Sparkles className="size-4" />
            Honger CV
          </div>
          <div className="p-4 sm:p-5 text-muted">Traditional Online Builders</div>
        </div>

        <div className="divide-y divide-line">
          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_1.4fr] text-sm transition-colors hover:bg-surface/30"
            >
              <div className="p-4 sm:p-5 font-semibold text-fg flex items-center">
                {row.feature}
              </div>

              {/* Honger CV Column */}
              <div className="flex items-start gap-3 bg-accent/5 p-4 sm:p-5 text-fg">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Check className="size-3.5 font-bold" />
                </span>
                <span className="font-medium text-xs sm:text-sm">{row.honger}</span>
              </div>

              {/* Traditional Builders Column */}
              <div className="flex items-start gap-3 p-4 sm:p-5 text-muted">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-500 mt-0.5">
                  <X className="size-3.5" />
                </span>
                <span className="text-xs sm:text-sm">{row.traditional}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
