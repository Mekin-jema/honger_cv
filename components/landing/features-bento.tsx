import {
  BrainCircuit,
  FileCheck2,
  Lock,
  Palette,
  ScanText,
  Sparkles,
  Zap,
} from "lucide-react";

export function FeaturesBento() {
  return (
    <section className="border-t border-line bg-bg-soft/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
            <Sparkles className="size-3.5 text-accent" />
            Engineered For Modern Hiring
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Everything your career story needs to win interviews.
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Built from the ground up to satisfy both automated recruiter algorithms and discerning hiring directors.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {/* Bento Item 1: Large Featured Card */}
          <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-8 shadow-sm md:col-span-2 lg:col-span-2 flex flex-col justify-between">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl"
            />
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <ScanText className="size-6" />
              </span>
              <span className="mt-6 inline-block rounded-full bg-surface px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                99% ATS Pass Rate
              </span>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-fg">
                ATS-First Semantic Document Architecture
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Recruiter parsing software trips over messy tables, text boxes, and broken glyphs. Honger CV outputs
                clean semantic HTML and structural tags that Greenhouse, Lever, and Workday ingest with 100% field accuracy.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-line bg-surface/50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>ATS Parsing Score</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">99 / 100</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "99%" }} />
              </div>
            </div>
          </div>

          {/* Bento Item 2: Dynamic Palette */}
          <div className="rounded-3xl border border-line bg-card p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Palette className="size-6" />
              </span>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-fg">
                Chameleon Color Engine
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Pick from 12+ designer palettes or punch in your signature hex code. Contrast is dynamically tuned for
                WCAG AA accessibility.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["#b5400f", "#2855c5", "#18745e", "#7b3fa1", "#087e8b"].map((col) => (
                <span
                  key={col}
                  className="size-6 rounded-full ring-2 ring-card shadow-xs"
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Bento Item 3: Vector PDF Print Calibration */}
          <div className="rounded-3xl border border-line bg-card p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <FileCheck2 className="size-6" />
              </span>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-fg">
                Vector PDF Print Fidelity
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Real vector glyphs and calibrated A4 millimetre page cuts. Never worry about orphaned section headers or
                clipped margins.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
              <span>Standard A4 Output</span>
              <span className="font-semibold text-fg">Zero Pixel Drift</span>
            </div>
          </div>

          {/* Bento Item 4: AI Conversational Persona */}
          <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-8 shadow-sm md:col-span-2 lg:col-span-2 flex flex-col justify-between">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <BrainCircuit className="size-6" />
              </span>
              <span className="mt-6 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                Exclusive Innovation
              </span>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-fg">
                Train Your Own AI Recruiter Assistant
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Beyond static paper: attach your personal Honger CV web link. Recruiters can ask questions about your
                architecture choices, system design, or specific leadership experiences, answered directly from your facts.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-line bg-[#1e2f3d] p-3 text-white text-xs">
              <p className="text-white/60">Recruiter:</p>
              <p className="text-white font-medium">
                &ldquo;Tell me about John Doe&apos;s experience with real-time data analytics.&rdquo;
              </p>
              <p className="mt-2 text-accent font-semibold">AI Assistant:</p>
              <p className="text-white/90">
                &ldquo;John Doe has experience using SQL and Oracle for data analysis, reporting, and business insights...&rdquo;
              </p>
            </div>
          </div>

          {/* Bento Item 5: Zero Paywalls */}
          <div className="rounded-3xl border border-line bg-card p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Zap className="size-6" />
              </span>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-fg">
                Instant Zero-Friction
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                No credit cards. No surprise paywalls right before download. No locked export buttons. Pure developer speed.
              </p>
            </div>

            <div className="mt-6 text-xs font-bold text-accent">
              100% Open & Accessible
            </div>
          </div>

          {/* Bento Item 6: Privacy Guarantee */}
          <div className="rounded-3xl border border-line bg-card p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Lock className="size-6" />
              </span>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-fg">
                Private & Uncompromised
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Your personal details, contact data, and employment history remain yours. We never scrape or sell resume
                data to third parties.
              </p>
            </div>

            <div className="mt-6 text-xs font-bold text-muted">
              Local & Session Privacy
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
