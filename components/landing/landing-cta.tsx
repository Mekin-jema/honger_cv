import Link from "next/link";
import { ArrowRight, BrainCircuit, Sparkles } from "lucide-react";

export function LandingCta() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-fg px-8 py-16 text-bg shadow-2xl sm:px-14 sm:py-20 lg:px-20">
        {/* Ambient background blur */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-[32rem] rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 size-[32rem] rounded-full bg-blue-500/15 blur-3xl"
        />

        <div className="relative z-10 flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-bg/20 bg-bg/10 px-3.5 py-1 text-xs font-semibold text-bg/90 shadow-xs backdrop-blur-md">
              <Sparkles className="size-3.5 text-accent" />
              Your Next Chapter Starts Here
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              Build a CV you&apos;re genuinely proud to send.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-bg/75 sm:text-lg">
              Explore 25+ designer layouts, choose your custom accent color, and walk away with a
              flawless vector PDF that demands attention.
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-bg/80">
              {["100% Free", "25+ Signature Designs", "No Credit Card", "Instant Vector PDF"].map(
                (badge) => (
                  <li key={badge} className="flex items-center gap-1.5">
                    <span className="grid size-4 place-items-center rounded-full bg-accent text-on-accent text-[9px] font-bold">
                      ✓
                    </span>
                    {badge}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row lg:flex-col shrink-0">
            <Link
              href="/cv/"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-8 text-base font-bold text-on-accent shadow-xl shadow-accent/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Open CV Studio Now <ArrowRight className="size-5" />
            </Link>

            <Link
              href="/ask/"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-bg/25 bg-bg/10 px-8 text-base font-semibold text-bg backdrop-blur-md transition hover:bg-bg/20"
            >
              Try AI Career Chat <BrainCircuit className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
