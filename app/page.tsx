import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cv as codeCv } from "@/content/cv";
import { readCv } from "@/lib/persona/cv";
import { currentPersona } from "@/server/persona/resolve";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  Bot,
  Check,
  FileText,
  Flame,
  Globe,
  Globe2,
  LayoutTemplate,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeroPreview } from "@/components/landing/hero-preview";
import { CvTemplateShowcase } from "@/components/landing/cv-template-showcase";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { ThemeToggle } from "@/components/theme-provider";
import { billingProducts } from "@/server/billing";
import {
  AmexBadge,
  CbBadge,
  ChapaLogo,
  MastercardBadge,
  PaymentBadgesRow,
  PaypalLogo,
  StripeLogo,
  VisaBadge,
} from "@/components/billing/payment-icons";

export const metadata: Metadata = {
  title: "Honger CV — Build a CV and portfolio that speaks for you",
  description:
    "Create your CV, publish a personal portfolio, and let an AI assistant answer questions about your work. Explore 25+ templates and try the public demo.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Honger CV — Build a CV and portfolio that speaks for you",
    description:
      "Build your CV and portfolio, then let an AI assistant help visitors explore your work.",
    url: "/",
  },
};

const capabilities = [
  {
    icon: FileText,
    title: "Build your CV",
    description: "Make it yours with layouts designed for real careers.",
  },
  {
    icon: Globe2,
    title: "Publish a portfolio",
    description: "Give your projects a home you can share anywhere.",
  },
  {
    icon: Bot,
    title: "Add a project assistant",
    description: "Let visitors ask questions about your work, any time.",
  },
  {
    icon: AudioLines,
    title: "Make it speak",
    description: "Voice replies are on the way, alongside text answers.",
  },
];

const steps = [
  { number: "01", title: "Shape your story", detail: "Add your experience, skills, and projects." },
  { number: "02", title: "Choose your look", detail: "Pick a template and tune the details." },
  { number: "03", title: "Share your work", detail: "Publish a portfolio with its own AI guide." },
];
const billingUrl = "/register/?next=%2Faccount%2Fbilling%2F";

export default async function Home() {
  const persona = await currentPersona();
  const sampleCv = readCv(persona.compiled.doc.document.data, codeCv);
  const cv = {
    ...sampleCv,
    showPhoto: false,
    photo: "",
    identity: {
      ...sampleCv.identity,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "",
      links: [],
    },
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-bg text-fg">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/90 backdrop-blur-md">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Honger CV home">
            <Image
              src="/honger-cv-logo-light.webp"
              alt=""
              width={38}
              height={38}
              priority
              className="size-[38px] rounded-lg object-cover dark:hidden"
            />
            <Image
              src="/honger-cv-logo.webp"
              alt=""
              width={38}
              height={38}
              priority
              className="hidden size-[38px] rounded-lg object-cover dark:block"
            />
            <span className="text-base font-bold tracking-tight">Honger CV</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#portfolio" className="transition-colors hover:text-fg">Portfolio AI</a>
            <a href="#templates" className="transition-colors hover:text-fg">Templates</a>
            <a href="#pricing" className="transition-colors hover:text-fg">Pricing</a>
            <a href="#how-it-works" className="transition-colors hover:text-fg">How it works</a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/ask/"
              className="hidden text-sm font-semibold text-muted transition-colors hover:text-fg sm:inline-flex"
            >
              Try the demo
            </Link>
            <Link
              href="/register/"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-on-accent transition hover:brightness-95 sm:px-4"
            >
              Build yours <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <MobileMenu />
            <ThemeToggle className="border border-line bg-card text-fg" />
          </div>
        </nav>
      </header>

      <section className="relative border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:py-20">
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
              <Sparkles className="size-4" aria-hidden="true" />
              Your work, made easy to explore
            </p>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]">
              Build a CV.
              <span className="block text-accent">Create a portfolio.</span>
              Let your work speak.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Make a CV that feels like you, publish the projects behind it, and give every visitor an AI assistant that can answer questions about your work.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/register/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-on-accent transition hover:brightness-95"
              >
                Create your CV <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/ask/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line-strong bg-card px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface"
              >
                Explore the public demo <ArrowDownRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-xs font-medium text-muted sm:text-sm">
              <span className="inline-flex items-center gap-2"><LayoutTemplate className="size-4 text-accent" />25+ templates</span>
              <span className="inline-flex items-center gap-2"><FileText className="size-4 text-accent" />CV and portfolio</span>
              <span className="inline-flex items-center gap-2"><Bot className="size-4 text-accent" />AI project answers</span>
            </div>
          </div>

          <div className="relative min-w-0 lg:translate-x-4 lg:pl-5">
            <div className="absolute -right-8 top-12 -z-10 hidden h-56 w-56 rounded-full border border-accent/20 sm:block" aria-hidden="true" />
            <HeroPreview />
            <p className="mt-3 text-center text-xs text-muted">A live preview, using a fictional John Doe sample CV</p>
          </div>
        </div>
      </section>

      <section aria-label="What you can build" className="border-b border-line bg-surface/60">
        <div className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`flex gap-3.5 px-5 py-5 sm:px-8 ${index % 2 === 0 ? "sm:border-r" : ""} border-line lg:border-r lg:last:border-r-0`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-accent shadow-sm">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="portfolio" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">A portfolio people can talk to</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Not just a page. A guide to your work.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted">
              Your projects deserve more than a thumbnail and a title. Add an AI assistant that helps recruiters, clients, and collaborators find the answers they need.
            </p>
            <div className="mt-7 flex flex-col gap-3 text-sm text-muted">
              <p className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-accent" />Visitors can ask about your projects and experience.</p>
              <p className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-accent" />The assistant answers from the information you publish.</p>
              <p className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-accent" />Text chat today, voice responses in development.</p>
            </div>
            <Link href="/ask/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline">
              Try the public demo <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="mt-2 text-xs text-muted">No account needed to explore the demo.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <Bot className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">John Doe&apos;s portfolio assistant</p>
                  <p className="text-xs text-muted">Ask about projects, skills, and experience</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold text-muted">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                Public demo
              </span>
            </div>
            <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <div className="ml-auto max-w-[85%] rounded-xl bg-surface px-4 py-3 text-sm leading-6 text-fg">
                What kind of projects have you worked on?
              </div>
              <div className="flex max-w-[92%] gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <p className="text-sm leading-6 text-muted">
                  Explore John Doe&apos;s sample portfolio. The assistant is ready for questions about the projects, experience, and skills shown.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line pt-5">
                {["Show me the projects", "What are your skills?", "Tell me about your experience"].map((prompt) => (
                  <span key={prompt} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">{prompt}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line bg-surface/60 px-5 py-3.5 sm:px-6">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
                <Mic className="size-4 text-accent" aria-hidden="true" />Voice replies are on the way
              </span>
              <AudioLines className="size-5 text-accent" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="CV templates" className="border-y border-line bg-surface/40">
        <CvTemplateShowcase cv={cv} />
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 border-b border-line pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">From first draft to shareable</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your story, in three steps.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">Start with your experience. Leave with a polished CV and a portfolio that can answer questions.</p>
          </div>
          <ol className="grid gap-8 pt-8 sm:grid-cols-3 sm:gap-6">
            {steps.map((step) => (
              <li key={step.number} className="border-l-2 border-accent pl-4 sm:pl-5">
                <p className="font-mono text-xs font-semibold text-accent">{step.number}</p>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-24 border-y border-line bg-surface/60 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Simple, transparent pricing</p>
            <h2 id="pricing-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Upgrade when you need more.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">Build and share your first CV for free. Choose a one-time pass for all 25+ templates and AI document import, or add ongoing tools to your portfolio.</p>
          </div>

          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">
            {/* PLAN 1: FREE CV */}
            <article className="flex flex-col justify-between rounded-3xl border border-line bg-card p-6 sm:p-7 shadow-xs">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted border border-line">
                    Starter
                  </span>
                  <span className="text-xs text-muted">Free Forever</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Your First CV</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-fg">ETB 0</span>
                    <span className="text-sm font-medium text-muted">/ $0 USD</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Full access to all 25+ templates, color palettes, and ATS vector PDF export for your first CV.
                  </p>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-line text-xs">
                  {[
                    "One CV with all 25+ designer layouts and palettes",
                    "Instant vector PDF export (ATS-friendly)",
                    "Live public portfolio link with curated answers",
                    "No credit card required to start",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="size-4 shrink-0 text-accent mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-line">
                <Link
                  href="/register/"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line-strong bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-surface/80"
                >
                  Create Your Free CV
                </Link>
              </div>
            </article>

            {/* PLAN 2: LIFETIME CV DESIGN PASS */}
            <article className="relative flex flex-col justify-between rounded-3xl border-2 border-accent bg-card p-6 sm:p-7 shadow-[var(--card-shadow)] ring-1 ring-accent/20 overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent text-on-accent px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-sm">
                  <Flame className="size-3.5 fill-current" /> Most Popular
                </span>
              </div>

              <div className="space-y-5">
                {/* Visual Image Banner */}
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-line bg-bg/40 shadow-inner">
                  <Image
                    src="/images/billing-pass-badge.jpg"
                    alt="Lifetime CV Design Pass"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-3.5">
                    <div>
                      <span className="rounded bg-accent px-2 py-0.5 text-[9px] font-extrabold text-on-accent uppercase tracking-wider">
                        Lifetime Deal
                      </span>
                      <h4 className="text-white text-sm font-bold mt-1">CV Design & AI Extraction Pass</h4>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Lifetime CV Design Pass</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                      $1 <span className="text-lg font-medium text-muted">USD</span>
                    </span>
                    <span className="text-sm font-semibold text-muted">or 100 ETB</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-accent">
                    One-time payment • Lifetime access • Zero monthly renewal
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-line text-xs">
                  {[
                    "All 25+ CV templates for life (Executive, Minimal, Creative)",
                    "Instant AI document extraction (PDF, DOCX, TXT resumes)",
                    "Create unlimited separate CV versions for different jobs",
                    "Speech synthesis sound playback on public profile",
                    "High-resolution vector PDF export",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="size-4 shrink-0 text-accent mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Actions with real icons */}
              <div className="mt-8 pt-4 border-t border-line space-y-2.5">
                <Link
                  href={billingUrl}
                  className="w-full flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95"
                >
                  <span className="flex items-center gap-2">
                    <StripeLogo className="size-4.5 rounded shadow-xs" />
                    <span>Pay with Card via Stripe ($1 USD)</span>
                  </span>
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <VisaBadge className="h-4 w-7 px-0.5 rounded-xs" />
                    <MastercardBadge className="h-4 w-7 px-0.5 rounded-xs" />
                    <AmexBadge className="h-4 w-7 px-0.5 rounded-xs" />
                  </div>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={billingUrl}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-bg px-3 py-2.5 text-xs font-semibold text-fg hover:border-accent transition-colors"
                  >
                    <ChapaLogo className="size-4" />
                    <span>Pay with Chapa (100 ETB)</span>
                  </Link>

                  <Link
                    href={billingUrl}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-bg px-3 py-2.5 text-xs font-semibold text-fg hover:border-accent transition-colors"
                  >
                    <PaypalLogo className="size-4" />
                    <span>Pay with PayPal ($1)</span>
                  </Link>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/40">
                  <PaymentBadgesRow label="Payments:" />
                  <span className="text-[11px] font-medium text-muted">Instant activation</span>
                </div>
              </div>
            </article>

            {/* PLAN 3: PORTFOLIO PRO */}
            <article className="relative flex flex-col justify-between rounded-3xl border border-line bg-card p-6 sm:p-7 shadow-xs overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide border border-accent/20">
                  <Sparkles className="size-3.5" /> AI & Insights
                </span>
              </div>

              <div className="space-y-5">
                {/* Visual Image Banner */}
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-line bg-bg/40 shadow-inner">
                  <Image
                    src="/images/billing-pro-badge.jpg"
                    alt="Portfolio Pro"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-3.5">
                    <div>
                      <span className="rounded bg-violet-600 px-2 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider">
                        AI Powered
                      </span>
                      <h4 className="text-white text-sm font-bold mt-1">Portfolio Pro AI & Insights</h4>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Portfolio Pro</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                      $4.99 <span className="text-lg font-medium text-muted">USD</span>
                    </span>
                    <span className="text-sm font-semibold text-muted">/ month</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-accent">
                    Monthly subscription • Cancel anytime in 1 click
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-line text-xs">
                  {[
                    "24/7 Recruiter AI Assistant grounded in your CV data",
                    "Interactive Voice Persona with speech synthesis",
                    "30-day visitor analytics & question logs",
                    "Priority semantic vector caching for instant answers",
                    "Basic public CV stays free forever if cancelled",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="size-4 shrink-0 text-accent mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-line space-y-2.5">
                <Link
                  href={billingUrl}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95"
                >
                  <PaypalLogo className="size-4" />
                  <span>Subscribe to Portfolio Pro ($4.99/mo)</span>
                  <ArrowRight className="size-3.5" />
                </Link>

                <p className="pt-2 text-center text-[11px] text-muted">
                  Managed securely by PayPal • No lock-in
                </p>
              </div>
            </article>
          </div>

          {/* Trust and Security row */}
          <div className="mt-10 rounded-2xl border border-line bg-card/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <span className="flex items-center gap-1.5 font-medium text-fg">
                <Lock className="size-3.5 text-accent" /> 256-Bit SSL Encryption
              </span>
              <span className="flex items-center gap-1.5 font-medium text-fg">
                <ShieldCheck className="size-3.5 text-accent" /> Powered by Stripe, Chapa & PayPal
              </span>
              <span className="flex items-center gap-1.5 font-medium text-fg">
                <Globe className="size-3.5 text-accent" /> Instant Global Activation
              </span>
            </div>

            <PaymentBadgesRow label="Payments:" />
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            Create an account before checking out. You can manage plans and payment options from your billing settings.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-surface/60 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your next step</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Put your work together. Let people discover it.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Create a polished CV first, then grow it into a portfolio. Or explore the public demo.</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/register/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-on-accent transition hover:brightness-95">
              Start building your CV <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/ask/" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line-strong bg-card px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface">
              Explore the demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Honger CV home">
            <Image src="/honger-cv-logo-light.webp" alt="" width={30} height={30} className="size-[30px] rounded-md object-cover dark:hidden" />
            <Image src="/honger-cv-logo.webp" alt="" width={30} height={30} className="hidden size-[30px] rounded-md object-cover dark:block" />
            <span className="text-sm font-bold">Honger CV</span>
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted">
            <Link href="/cv/" className="hover:text-fg">CV Studio</Link>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
            <Link href="/ask/" className="hover:text-fg">Public demo</Link>
            <Link href="/register/" className="hover:text-fg">Create account</Link>
          </div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} Honger CV</p>
        </div>
      </footer>
    </main>
  );
}
