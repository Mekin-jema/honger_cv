import Link from "next/link";
import { ArrowRight, FileCheck, Palette, Sparkles, Wand2 } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Select your signature design",
    description:
      "Choose from 25+ designer layouts—from bold executive rails and modern minimalists to creative editorial splits. Tune the accent color to match your personal brand.",
    icon: Palette,
    badge: "25+ Layouts & Palettes",
  },
  {
    step: "02",
    title: "Structure & polish with AI assistance",
    description:
      "Enter your experience, achievements, and technical stack. Your built-in AI persona suggests high-impact, metric-driven bullet points that recruiters look for.",
    icon: Wand2,
    badge: "AI-Powered Bullet Points",
  },
  {
    step: "03",
    title: "Export crisp vector PDF & share live",
    description:
      "Generate a millimetre-perfect A4 vector PDF ready for applications. Plus, get an interactive live link where hiring managers can chat directly with your AI profile.",
    icon: FileCheck,
    badge: "1-Click PDF + Live Link",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-line bg-bg-soft/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
            <Sparkles className="size-3.5 text-accent" />
            Simple 3-Step Process
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            From rough draft to dream role in minutes.
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            No fighting with formatting margins, misaligned bullet points, or unexpected page break glitches.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative flex flex-col justify-between rounded-3xl border border-line bg-card p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                      <Icon className="size-6" />
                    </span>
                    <span className="font-mono text-2xl font-bold text-faint">
                      {item.step}
                    </span>
                  </div>

                  <span className="mt-6 inline-block rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                    {item.badge}
                  </span>

                  <h3 className="mt-4 text-xl font-bold tracking-tight text-fg">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>

                <div className="mt-8 border-t border-line/60 pt-4">
                  <span className="flex items-center gap-2 text-xs font-semibold text-accent group-hover:gap-3 transition-all">
                    Step {item.step} in CV Studio <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
