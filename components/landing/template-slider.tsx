"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import {
  TEMPLATE_ITEMS,
  TEMPLATE_CATEGORIES,
  PALETTES,
  type TemplateCategory,
} from "./landing-data";

export function TemplateSlider() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [accentColor, setAccentColor] = useState<string>("#b5400f");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return TEMPLATE_ITEMS;
    return TEMPLATE_ITEMS.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const currentTemplate = filteredTemplates[currentIndex] || filteredTemplates[0];

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredTemplates.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPlaying, filteredTemplates.length]);

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + filteredTemplates.length) % filteredTemplates.length);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % filteredTemplates.length);
  };

  const handleSelect = (index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  };

  const copyTemplateLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/cv/?template=${currentTemplate.id}&color=${encodeURIComponent(accentColor)}`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Thumbnail rail scroll ref
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = thumbnailRailRef.current;
    const activeBtn = rail?.children[currentIndex] as HTMLElement | undefined;
    if (!rail || !activeBtn) return;

    const railRect = rail.getBoundingClientRect();
    const activeRect = activeBtn.getBoundingClientRect();
    const centeredLeft =
      rail.scrollLeft + activeRect.left - railRect.left - (rail.clientWidth - activeBtn.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
  }, [currentIndex]);

  return (
    <section id="templates" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      {/* Background Decorative Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-20 -z-10 size-[32rem] rounded-full opacity-20 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1 text-xs font-semibold text-muted shadow-xs">
            <Sparkles className="size-3.5 text-accent" />
            Interactive Template Studio Preview
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Explore 25+ Handcrafted Layouts
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
            Slide through every signature template, test live accent colors, and see how your experience will look in print.
          </p>
        </div>

        {/* Carousel Navigation Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg"
            title={isPlaying ? "Pause auto-slide" : "Start auto-slide"}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                <span className="hidden sm:inline">Auto-play</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-card p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous template"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-fg"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="px-2 font-mono text-xs font-semibold text-muted">
              {String(currentIndex + 1).padStart(2, "0")} / {String(filteredTemplates.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next template"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-fg"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="no-scrollbar mt-8 flex items-center gap-2 overflow-x-auto border-b border-line pb-3">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setCurrentIndex(0);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-fg text-bg shadow-sm"
                  : "bg-card text-muted border border-line hover:bg-surface hover:text-fg"
              }`}
            >
              {cat.label}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? "bg-bg/20 text-bg" : "bg-surface text-muted"
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
        {/* Left: Detailed Mockup Preview Sheet */}
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-card p-4 shadow-xl sm:p-7">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-xs font-semibold text-fg">
                {currentTemplate.name} Preview
              </span>
              {currentTemplate.badge && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
                  {currentTemplate.badge}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="font-mono text-[11px]">{currentTemplate.layoutStyle}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                ATS {currentTemplate.atsScore}%
              </span>
            </div>
          </div>

          {/* Dynamic Template Canvas */}
          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-[#fffdf9] text-[#1f1d1a] shadow-inner">
            {/* Split layout preview (navy-rail, lavender-split, etc.) */}
            {currentTemplate.category === "split" ? (
              <div className="grid min-h-[460px] sm:grid-cols-[0.8fr_1.2fr]">
                <aside
                  className="p-6 text-white"
                  style={{
                    backgroundColor:
                      currentTemplate.id === "lavender-split"
                        ? "#f2eff8"
                        : currentTemplate.id === "slate-sidebar"
                        ? "#383f48"
                        : currentTemplate.id === "orange-split"
                        ? "#fcedea"
                        : currentTemplate.id === "studio-rail"
                        ? "#15202b"
                        : "#1e2f3d",
                    color:
                      currentTemplate.id === "lavender-split" || currentTemplate.id === "orange-split"
                        ? "#2e263d"
                        : "#ffffff",
                  }}
                >
                  <div
                    className="grid size-14 place-items-center rounded-2xl text-lg font-bold text-white shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    AM
                  </div>
                  <h3 className="mt-4 text-base font-bold">Alex Morgan</h3>
                  <p className="text-[11px] opacity-80">Senior Systems & Cloud Engineer</p>

                  <div className="mt-6 space-y-4 border-t border-current/15 pt-4 text-[10px]">
                    <div>
                      <p className="font-bold uppercase tracking-widest text-[9px] opacity-75">
                        Profile
                      </p>
                      <p className="mt-1.5 leading-relaxed opacity-90">
                        Senior engineer with 6+ years building high-throughput distributed microservices,
                        real-time web platforms, and automated cloud infrastructure.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold uppercase tracking-widest text-[9px] opacity-75">
                        Technical Stack
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {["TypeScript", "React", "Next.js", "Python", "Go", "Docker", "PostgreSQL"].map(
                          (skill) => (
                            <span
                              key={skill}
                              className="rounded border border-current/20 bg-current/10 px-2 py-0.5 text-[9px] font-medium"
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-bold uppercase tracking-widest text-[9px] opacity-75">
                        Location & Contact
                      </p>
                      <div className="mt-1.5 space-y-1 opacity-80">
                        <p>📍 San Francisco, CA</p>
                        <p>✉️ alex.morgan@example.com</p>
                        <p>🔗 alexmorgan.dev</p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="p-6">
                  <div className="border-b border-line pb-3">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Career Highlights
                    </span>
                    <h4 className="mt-2 text-xl font-bold tracking-tight text-[#1e2f3d]">
                      Work Experience
                    </h4>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="relative border-l-2 pl-3.5" style={{ borderColor: accentColor }}>
                      <div className="flex items-center justify-between text-xs font-bold text-[#1e2f3d]">
                        <span>Senior Software Engineer</span>
                        <span className="text-[10px] text-muted font-normal">2023 - Present</span>
                      </div>
                      <p className="text-[11px] font-medium" style={{ color: accentColor }}>
                        Apex Cloud Technologies
                      </p>
                      <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[#4b4843]">
                        <li>• Engineered automated ingestion pipelines processing 25M+ daily webhook events.</li>
                        <li>• Reduced cloud latency by 38% through Redis caching and query optimization.</li>
                      </ul>
                    </div>

                    <div className="relative border-l-2 border-line pl-3.5">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1e2f3d]">
                        <span>Full-Stack Software Engineer</span>
                        <span className="text-[10px] text-muted font-normal">2021 - 2023</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#4b4843]">Meridian Labs</p>
                      <p className="mt-1 text-[10px] text-[#4b4843]">
                        Delivered customer-facing analytics dashboards used daily by 50,000+ business accounts.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-line pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#1e2f3d]">
                      Education & Honors
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-[#1e2f3d]">B.S. in Computer Science</p>
                        <p className="text-[10px] text-muted">State University</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Magna Cum Laude
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentTemplate.category === "timeline" ? (
              /* Timeline Layout Preview */
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: accentColor }}>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-[#1f1d1a]">Alex Morgan</h3>
                    <p className="text-xs font-semibold" style={{ color: accentColor }}>
                      {currentTemplate.name} · Career Path & Milestones
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted">
                    <p>alex.morgan@example.com</p>
                    <p>San Francisco, CA</p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <div className="relative border-l-2 pl-5" style={{ borderColor: accentColor }}>
                    <span
                      className="absolute -left-1.5 top-0 size-3 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-sm font-bold text-[#1f1d1a]">Senior Software Engineer · Apex Cloud Technologies</h4>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-semibold text-muted">
                        2023 - Present
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#4b4843]">
                      Leading core platform architecture, real-time event streaming pipelines, and microservices
                      resilience using TypeScript, Go, and PostgreSQL.
                    </p>
                  </div>

                  <div className="relative border-l-2 border-line pl-5">
                    <span className="absolute -left-1.5 top-0 size-3 rounded-full bg-line-strong" />
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-sm font-bold text-[#1f1d1a]">Full-Stack Engineer · Meridian Labs</h4>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-semibold text-muted">
                        2021 - 2023
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#4b4843]">
                      Engineered customer-facing analytics dashboards, reusable UI design systems, and secure
                      Stripe subscription billing infrastructure.
                    </p>
                  </div>

                  <div className="relative border-l-2 border-line pl-5">
                    <span className="absolute -left-1.5 top-0 size-3 rounded-full bg-line-strong" />
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-sm font-bold text-[#1f1d1a]">State University</h4>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-semibold text-muted">
                        B.S. Computer Science
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#4b4843]">
                      Magna Cum Laude · Dean's Honor List · Distributed Systems Focus.
                    </p>
                  </div>
                </div>
              </div>
            ) : currentTemplate.category === "executive" ? (
              /* Executive Grid Preview */
              <div className="p-6 sm:p-7">
                <div className="border-b-4 pb-4" style={{ borderColor: accentColor }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-wider text-[#1f1d1a]">
                        ALEX MORGAN
                      </h3>
                      <p className="text-xs font-bold tracking-widest text-muted uppercase">
                        Lead Software & Cloud Systems Architect
                      </p>
                    </div>
                    <span
                      className="rounded-md px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: accentColor }}
                    >
                      Executive Edition
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 text-[10px]">
                  <div className="rounded-lg border border-line bg-surface/40 p-3.5">
                    <p className="font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                      Executive Summary
                    </p>
                    <p className="mt-2 leading-relaxed text-[#4b4843]">
                      High-impact Systems Architect with proven excellence in distributed microservices,
                      cloud data pipelines, and full-stack software leadership. Magna Cum Laude graduate.
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-surface/40 p-3.5">
                    <p className="font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                      Core Competencies
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["Full-Stack React", "Next.js 15+", "Go / Python", "PostgreSQL", "Docker", "AWS"].map(
                        (tag) => (
                          <span key={tag} className="rounded bg-card px-2 py-0.5 font-medium text-fg shadow-xs">
                            {tag}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1f1d1a]">
                    Verified Accomplishments
                  </h4>
                  <div className="mt-2 space-y-2 text-[10px] text-[#4b4843]">
                    <p>• Scaled distributed ingestion pipelines to 25M+ daily transactions at Apex Cloud.</p>
                    <p>• Built high-performance real-time telemetry systems with zero unplanned downtime.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Modern / Editorial / Compact Preview */
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: accentColor }}>
                  <div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: accentColor }}
                    >
                      {currentTemplate.categoryLabel}
                    </span>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1f1d1a]">
                      Alex Morgan
                    </h3>
                    <p className="text-xs text-muted">Senior Software Engineer · State University</p>
                  </div>
                  <div className="text-right text-[10px] text-muted space-y-0.5">
                    <p>📍 San Francisco, CA</p>
                    <p>✉️ alex.morgan@example.com</p>
                    <p>🔗 github.com/alexmorgan</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-b pb-4 text-center">
                  <div className="rounded-lg bg-surface/50 p-2">
                    <p className="text-sm font-bold text-[#1f1d1a]">99.9%</p>
                    <p className="text-[9px] text-muted">Uptime SLA</p>
                  </div>
                  <div className="rounded-lg bg-surface/50 p-2">
                    <p className="text-sm font-bold" style={{ color: accentColor }}>
                      99%
                    </p>
                    <p className="text-[9px] text-muted">ATS Verified</p>
                  </div>
                  <div className="rounded-lg bg-surface/50 p-2">
                    <p className="text-sm font-bold text-[#1f1d1a]">25+</p>
                    <p className="text-[9px] text-muted">Layout Styles</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#1f1d1a]">
                      <span>Senior Software Engineer · Apex Cloud Technologies</span>
                      <span className="text-[10px] text-muted font-normal">2023 - Present</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#4b4843]">
                      Distributed systems, real-time webhook infrastructure, and database optimization.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#1f1d1a]">
                      <span>Featured Projects & Open Source</span>
                      <span className="text-[10px] text-muted font-normal">Cloud / Tooling</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#4b4843]">
                      PulseMetrics distributed monitoring engine & NovaFlow declarative task runner.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Template Details & Live Customizer */}
        <div className="flex flex-col gap-6 rounded-[2rem] border border-line bg-card p-6 shadow-xl sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                {currentTemplate.categoryLabel}
              </span>
              <span className="font-mono text-xs text-muted">
                Template {String(currentIndex + 1).padStart(2, "0")} of {String(filteredTemplates.length).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              {currentTemplate.name}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {currentTemplate.description}
            </p>
          </div>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-3 border-y border-line py-4 text-xs">
            <div>
              <span className="text-muted">Best for:</span>
              <p className="mt-1 font-semibold text-fg">{currentTemplate.bestFor}</p>
            </div>
            <div>
              <span className="text-muted">Format:</span>
              <p className="mt-1 font-semibold text-fg">{currentTemplate.pages}</p>
            </div>
          </div>

          {/* Live Color Switcher */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Accent Palette
              </label>
              <span className="text-xs font-mono text-muted">{accentColor}</span>
            </div>

            <div className="mt-3 grid grid-cols-6 gap-2">
              {PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setAccentColor(pal.color)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${
                    accentColor === pal.color
                      ? "ring-2 ring-fg scale-105 bg-surface font-semibold"
                      : "hover:bg-surface/60"
                  }`}
                  title={`${pal.name} (${pal.desc})`}
                >
                  <span
                    className="size-6 rounded-lg shadow-xs"
                    style={{ backgroundColor: pal.color }}
                  />
                  <span className="text-[10px] text-muted truncate max-w-full">{pal.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key Advantages Checklist */}
          <ul className="space-y-2 text-xs text-muted">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500 shrink-0" />
              <span>ATS Parsed & Verified (Greenhouse, Lever, Workday)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500 shrink-0" />
              <span>Pixel-perfect A4 vector print PDF calibration</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500 shrink-0" />
              <span>Custom hex color theming with WCAG AA compliance</span>
            </li>
          </ul>

          {/* Direct Studio Launch CTA */}
          <div className="space-y-2.5 pt-2">
            <Link
              href={`/cv/?template=${currentTemplate.id}&color=${encodeURIComponent(accentColor)}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-on-accent shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Use {currentTemplate.name} in CV Studio
              <ExternalLink className="size-4" />
            </Link>

            <button
              type="button"
              onClick={copyTemplateLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface/50 py-2.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg"
            >
              {isCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  Copied link to this template!
                </>
              ) : (
                "Share or copy link to this template"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            All {filteredTemplates.length} Templates in this category
          </p>
          <span className="text-xs text-muted">Click any thumbnail to preview</span>
        </div>

        <div
          ref={thumbnailRailRef}
          className="no-scrollbar flex gap-3 overflow-x-auto pb-4 pt-1"
        >
          {filteredTemplates.map((item, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(idx)}
                className={`group flex w-44 shrink-0 flex-col rounded-xl border p-2.5 text-left transition-all ${
                  isSelected
                    ? "border-accent bg-accent-soft/30 ring-2 ring-accent shadow-md scale-102"
                    : "border-line bg-card hover:border-line-strong hover:bg-surface/50"
                }`}
              >
                {/* Visual miniature */}
                <div className="h-16 rounded-lg border border-line/60 bg-[#fffdfa] p-2 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-xs shrink-0"
                      style={{ backgroundColor: item.accentRecommended ?? accentColor }}
                    />
                    <div className="h-1.5 w-3/4 rounded bg-fg/60" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-full rounded bg-muted/20" />
                    <div className="h-1 w-2/3 rounded bg-muted/20" />
                  </div>
                </div>

                <p className="mt-2 text-xs font-bold text-fg truncate group-hover:text-accent">
                  {item.name}
                </p>
                <p className="text-[10px] text-muted truncate">{item.categoryLabel}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
