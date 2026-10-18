import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileDown,
  LayoutTemplate,
  Palette,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "CV Studio",
  description:
    "Create a standout CV with 25+ polished layouts, flexible color themes, and a print-ready PDF preview.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "CV Studio — Make your next move stand out",
    description:
      "Choose from 25+ CV designs, customize your colors, and export a polished PDF.",
    url: "/",
  },
};

const highlights = [
  { icon: LayoutTemplate, value: "25+", label: "CV designs" },
  { icon: Palette, value: "Any color", label: "Your own palette" },
  { icon: FileDown, value: "PDF-ready", label: "Made to print" },
];

const features = [
  {
    icon: LayoutTemplate,
    title: "Find your format",
    description:
      "Explore more than 25 layouts—from clean and classic to bold, colorful, and two-column.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    description:
      "Choose a palette or pick any custom accent color. Your design updates as you explore.",
  },
  {
    icon: FileDown,
    title: "Ready to share",
    description:
      "Preview your CV on the page, then save a crisp, print-ready PDF of the design you selected.",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-bg text-fg">
      <header className="relative z-10 border-b border-line/70">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <Link href="/" className="flex items-center gap-3" aria-label="CV Studio home">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-on-accent shadow-sm">
              <FileDown className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">CV Studio</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <Link
              href="/ask/"
              className="hidden text-sm font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
            >
              Ask AI
            </Link>
            <Link
              href="/cv/"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-fg px-4 text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
            >
              Open CV Studio <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <ThemeToggle className="border border-line bg-card text-fg shadow-sm" />
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[34rem] rounded-full bg-accent/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3.5 py-2 text-xs font-semibold text-muted shadow-sm">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              A better first impression starts here
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Your experience,
              <span className="block text-accent">beautifully told.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
              Turn your work into a CV that feels like you. Choose a design,
              tune the details, and leave with a polished PDF—without fighting
              with formatting.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cv/"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-semibold text-on-accent shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Create your CV <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/ask/"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-line-strong bg-card px-6 text-base font-semibold transition hover:bg-surface"
              >
                Explore with AI
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
              {["25+ ready-to-use designs", "Custom color choices", "PDF export"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-accent">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-accent/10 blur-2xl" />
            <div className="rounded-[2rem] border border-line bg-card p-3 shadow-2xl shadow-fg/10 sm:p-5">
              <div className="mb-3 flex items-center justify-between px-2 py-1">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-[#f87171]" />
                  <span className="size-2.5 rounded-full bg-[#fbbf24]" />
                  <span className="size-2.5 rounded-full bg-[#34d399]" />
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                  Live preview
                </span>
              </div>
              <div className="grid min-h-[390px] overflow-hidden rounded-xl border border-line bg-[#fffefa] text-[#24221f] sm:min-h-[440px] sm:grid-cols-[0.82fr_1.18fr]">
                <aside className="bg-[#263b4b] p-5 text-white sm:p-6">
                  <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-white/15 text-lg font-bold ring-1 ring-white/25">
                    MJ
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f7b18a]">
                    Profile
                  </p>
                  <div className="mt-3 h-2 w-4/5 rounded bg-white/90" />
                  <div className="mt-2 h-1.5 w-3/5 rounded bg-white/45" />
                  <div className="mt-7 space-y-2">
                    {[78, 92, 66, 84].map((width, index) => (
                      <div
                        key={index}
                        className="h-1.5 rounded bg-white/35"
                        style={{ width: `${width}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-8 h-px bg-white/20" />
                  <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#f7b18a]">
                    Skills
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["React", "AI", "SQL", "Design"].map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-white/20 px-2 py-1 text-[9px] text-white/85"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </aside>
                <div className="p-5 sm:p-7">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b5400f]">
                    Software Engineer
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Mekin Jemal
                  </h2>
                  <div className="mt-2 h-1 w-12 rounded-full bg-[#b5400f]" />
                  <section className="mt-7">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#263b4b]">
                      Experience
                    </h3>
                    <div className="mt-3 border-l-2 border-[#b5400f]/35 pl-3">
                      <div className="h-2 w-3/4 rounded bg-[#263b4b]/80" />
                      <div className="mt-2 h-1.5 w-1/2 rounded bg-[#b5400f]/65" />
                      <div className="mt-3 space-y-1.5">
                        {[100, 94, 78].map((width, index) => (
                          <div
                            key={index}
                            className="h-1 rounded bg-[#263b4b]/15"
                            style={{ width: `${width}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                  <section className="mt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#263b4b]">
                      Selected projects
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {["AI assistant", "SmartDrainX"].map((project) => (
                        <div key={project} className="rounded-lg bg-[#f4f1eb] p-2.5">
                          <div className="h-1.5 w-3/4 rounded bg-[#263b4b]/65" />
                          <div className="mt-2 h-1 w-full rounded bg-[#263b4b]/15" />
                        </div>
                      ))}
                    </div>
                  </section>
                  <div className="mt-7 flex items-center justify-between border-t border-[#263b4b]/10 pt-3 text-[9px] text-[#62605c]">
                    <span>Designed to stand out</span>
                    <span>01 / 02</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-2 pt-4">
                <span className="text-xs font-medium text-muted">25+ ways to make it yours</span>
                <div className="flex gap-1.5" aria-label="Example accent color palette">
                  {["#b5400f", "#2855c5", "#18745e", "#7b3fa1", "#be456b"].map((color) => (
                    <span
                      key={color}
                      className="size-4 rounded-full ring-2 ring-card"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-bg-soft/70">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8">
          {highlights.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl bg-card/70 p-4 sm:justify-center">
              <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{value}</p>
                <p className="text-sm text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Made for your next move</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Less formatting. More you.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            Everything you need to turn your experience into a clear, confident,
            and memorable application.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="rounded-3xl border border-line bg-card p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-sm text-faint">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{title}</h3>
              <p className="mt-3 leading-7 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-fg px-7 py-10 text-bg sm:px-12 sm:py-12 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bg/60">Your next chapter starts now</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Make a CV you&apos;re proud to send.
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-bg/70">
              Pick a look, choose your color, and see your experience come together.
            </p>
          </div>
          <Link
            href="/cv/"
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-on-accent transition hover:-translate-y-0.5"
          >
            Explore 25+ designs <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>CV Studio · Build a CV that feels like you.</p>
          <div className="flex gap-5">
            <Link href="/cv/" className="hover:text-fg">CV Studio</Link>
            <Link href="/ask/" className="hover:text-fg">Ask AI</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
