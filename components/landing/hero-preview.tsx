"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, SlidersHorizontal, ExternalLink } from "lucide-react";
import { PALETTES } from "./landing-data";
import type { CvTemplateId } from "@/lib/persona/cv-templates";

const HERO_TEMPLATES: { id: CvTemplateId; name: string; tag: string }[] = [
  { id: "navy-rail", name: "Navy Rail", tag: "Most Popular" },
  { id: "modern", name: "Soft Modern", tag: "Clean ATS" },
  { id: "executive-grid", name: "Executive Grid", tag: "Senior / Exec" },
  { id: "lavender-split", name: "Lavender Split", tag: "Designer Fav" },
  { id: "gold-timeline", name: "Gold Timeline", tag: "Tech Timeline" },
];

export function HeroPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<CvTemplateId>("navy-rail");
  const [accentColor, setAccentColor] = useState<string>("#b5400f");

  const currentTpl = HERO_TEMPLATES.find((t) => t.id === selectedTemplate) ?? HERO_TEMPLATES[0];

  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      {/* Ambient background glow matching accent */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] opacity-35 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: accentColor }}
      />

      {/* Main card container */}
      <div className="relative overflow-hidden rounded-[2.2rem] border border-line bg-card shadow-2xl shadow-fg/10">
        {/* Top window chrome */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#f87171]" />
              <span className="size-2.5 rounded-full bg-[#fbbf24]" />
              <span className="size-2.5 rounded-full bg-[#34d399]" />
            </div>
            <span className="ml-2 rounded-full border border-line bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted">
              {currentTpl.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted">Accent:</span>
            <div className="flex items-center gap-1">
              {PALETTES.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccentColor(item.color)}
                  aria-label={`Select ${item.name} accent`}
                  className={`size-4 rounded-full ring-2 transition-transform hover:scale-125 ${
                    accentColor === item.color ? "ring-fg scale-110" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Template Quick Tabs */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line bg-bg-soft/70 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1 px-1 font-semibold text-muted">
            <SlidersHorizontal className="size-3" />
            Style:
          </span>
          {HERO_TEMPLATES.map((item) => {
            const active = selectedTemplate === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTemplate(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? "bg-card font-semibold text-fg shadow-sm ring-1 ring-line-strong"
                    : "text-muted hover:bg-card/60 hover:text-fg"
                }`}
              >
                {item.name}
                {active && <span className="size-1.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>

        {/* Dynamic Mockup Body */}
        <div className="p-3 sm:p-5">
          <div
            className="overflow-hidden rounded-xl border border-line bg-[#fffefa] text-[#24221f] transition-all duration-300"
            style={{
              ["--hero-accent" as string]: accentColor,
            }}
          >
            {/* Conditional Template Previews */}
            {selectedTemplate === "navy-rail" && (
              <div className="grid min-h-[420px] sm:grid-cols-[0.85fr_1.15fr]">
                {/* Left Navy Column */}
                <aside className="bg-[#1e2f3d] p-5 text-white sm:p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-12 shrink-0 place-items-center rounded-2xl font-bold text-white shadow-inner"
                      style={{ backgroundColor: accentColor }}
                    >
                      MJ
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-tight text-white">Mekin Jemal</p>
                      <p className="text-[10px] text-white/70">Computer Engineer</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">
                      About Me
                    </p>
                    <p className="mt-2 text-[10px] leading-relaxed text-white/80">
                      Software & AI engineer. AAU CGPA 3.70. Hands-on telecom analytics & full-stack software.
                    </p>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">
                      Core Competencies
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {["TypeScript", "React", "Next.js", "Python", "SQL", "LangChain", "Docker"].map(
                        (skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/90"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f7b18a]">
                      Contact
                    </p>
                    <div className="mt-1.5 space-y-1 text-[9px] text-white/70">
                      <p>📍 Addis Ababa, Ethiopia</p>
                      <p>✉️ mekin@example.com</p>
                      <p>🌐 github.com/mekin-jema</p>
                    </div>
                  </div>
                </aside>

                {/* Right Experience Column */}
                <div className="p-5 sm:p-6">
                  <div className="border-b border-[#263b4b]/10 pb-4">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Senior Full-Stack & AI
                    </span>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-[#1e2f3d]">
                      Professional Experience
                    </h3>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="relative border-l-2 pl-3.5" style={{ borderColor: accentColor }}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-[#1e2f3d]">Data & Analytics Engineer</span>
                        <span className="text-[10px] font-medium text-muted">2026 - Present</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#b5400f]" style={{ color: accentColor }}>
                        Safaricom Ethiopia PLC
                      </p>
                      <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[#4b4843]">
                        <li>• Formulate revenue & pricing KPI models analyzing millions of daily telecom events.</li>
                        <li>• Delivered automated Python & SQL pipelines for business analytics.</li>
                      </ul>
                    </div>

                    <div className="relative border-l-2 border-line pl-3.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-[#1e2f3d]">Full-Stack Software Engineer</span>
                        <span className="text-[10px] font-medium text-muted">2025 - 2026</span>
                      </div>
                      <p className="text-[11px] font-medium text-[#4b4843]">Tech Systems Ethiopia</p>
                      <p className="mt-1 text-[10px] text-[#4b4843]">
                        Architected Next.js microservices and real-time GIS mapping platforms.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#263b4b]/10 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1e2f3d]">
                      Featured Projects
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg border border-line bg-[#f8f6f0] p-2">
                        <p className="font-semibold text-[#1e2f3d]">AI Chat Assistant</p>
                        <p className="text-[9px] text-muted">LangChain & RAG agent</p>
                      </div>
                      <div className="rounded-lg border border-line bg-[#f8f6f0] p-2">
                        <p className="font-semibold text-[#1e2f3d]">SmartDrain IoT</p>
                        <p className="text-[9px] text-muted">ESP32 + Realtime Cloud</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate === "modern" && (
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: accentColor }}>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-[#1f1d1a]">Mekin Jemal</h3>
                    <p className="text-xs font-semibold" style={{ color: accentColor }}>
                      Full-Stack & AI Systems Engineer · AAU CGPA 3.70
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted">
                    <p>mekin@example.com</p>
                    <p>github.com/mekin-jema</p>
                    <p>Addis Ababa, Ethiopia</p>
                  </div>
                </div>

                <div className="mt-5">
                  <h4
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accentColor }}
                  >
                    Executive Summary
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#4b4843]">
                    Computer Engineer with hands-on expertise building production full-stack systems, automated telemetry
                    workflows, and generative AI agents across enterprise environments.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-3 text-center">
                  <div>
                    <p className="text-base font-bold text-[#1f1d1a]">3.70</p>
                    <p className="text-[9px] text-muted">AAU CGPA</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: accentColor }}>
                      100%
                    </p>
                    <p className="text-[9px] text-muted">ATS Verified</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1f1d1a]">15+</p>
                    <p className="text-[9px] text-muted">Shipped Projects</p>
                  </div>
                </div>

                <div className="mt-5">
                  <h4
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accentColor }}
                  >
                    Work History
                  </h4>
                  <div className="mt-2 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1f1d1a]">Safaricom Ethiopia PLC — Data Analyst</span>
                        <span className="text-[10px] text-muted">2026 - Present</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#4b4843]">
                        Spearheaded data transformations and automated analytics across enterprise telecom data sets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate === "executive-grid" && (
              <div className="p-6">
                <div className="bg-[#1f1d1a] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white">MEKIN JEMAL</h3>
                      <p className="text-[10px] font-medium tracking-widest text-[#f8e6da] uppercase">
                        Lead Full-Stack & Systems Architect
                      </p>
                    </div>
                    <span
                      className="rounded px-2.5 py-1 text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: accentColor }}
                    >
                      Executive Level
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-[10px]">
                  <div className="border border-line p-3">
                    <p className="font-bold text-[#1f1d1a] uppercase tracking-wider" style={{ color: accentColor }}>
                      Leadership Milestones
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[#4b4843]">
                      <li>• Graduated AAU with 3.70 Distinction in Computer Engineering.</li>
                      <li>• Led architecture for SmartDrain IoT telemetry deployment.</li>
                      <li>• Engineered enterprise pricing analytics models at Safaricom.</li>
                    </ul>
                  </div>
                  <div className="border border-line p-3">
                    <p className="font-bold text-[#1f1d1a] uppercase tracking-wider" style={{ color: accentColor }}>
                      Technical Stack
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["TypeScript", "React", "FastAPI", "PostgreSQL", "Docker", "LangChain", "AWS"].map((s) => (
                        <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-[#1f1d1a]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate === "lavender-split" && (
              <div className="grid min-h-[420px] sm:grid-cols-[0.85fr_1.15fr]">
                <aside className="bg-[#f2eff8] p-5 text-[#3b324a]">
                  <div
                    className="grid size-12 place-items-center rounded-2xl font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    MJ
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#2e263d]">Mekin Jemal</p>
                  <p className="text-[10px] font-medium text-[#6b5f82]">Creative Engineer</p>

                  <div className="mt-5 border-t border-[#3b324a]/10 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#6b5f82]">Design & Tech</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["UI/UX", "Next.js", "Tailwind", "Framer", "React Native", "AI"].map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-[#3b324a] shadow-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="p-5">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                    Portfolio Highlights
                  </p>
                  <h4 className="mt-1 text-lg font-bold text-[#1f1d1a]">Product Experience</h4>
                  <div className="mt-3 space-y-3 text-[10px]">
                    <div className="rounded-lg border border-[#e8e4f0] p-3">
                      <p className="font-bold text-[#2e263d]">AI Persona Chat Platform</p>
                      <p className="text-muted">Interactive conversational portfolio with streaming LLM agents.</p>
                    </div>
                    <div className="rounded-lg border border-[#e8e4f0] p-3">
                      <p className="font-bold text-[#2e263d]">Telecom CVM & Pricing</p>
                      <p className="text-muted">Optimizing customer lifecycle value with real-time data science.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate === "gold-timeline" && (
              <div className="grid min-h-[420px] sm:grid-cols-[0.8fr_1.2fr]">
                <aside className="bg-[#1b1c1e] p-5 text-white">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#fbbf24]">
                    Skills Matrix
                  </p>
                  <div className="mt-4 space-y-2 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-white/80">Full-Stack Dev</span>
                      <span className="text-[#fbbf24] font-bold">95%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/20">
                      <div className="h-1 rounded-full bg-[#fbbf24]" style={{ width: "95%" }} />
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-white/80">AI & LLM Systems</span>
                      <span className="text-[#fbbf24] font-bold">90%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/20">
                      <div className="h-1 rounded-full bg-[#fbbf24]" style={{ width: "90%" }} />
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-white/80">Data Engineering</span>
                      <span className="text-[#fbbf24] font-bold">88%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/20">
                      <div className="h-1 rounded-full bg-[#fbbf24]" style={{ width: "88%" }} />
                    </div>
                  </div>
                </aside>

                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      Timeline Milestones
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 pl-2">
                    <div className="relative border-l-2 border-[#fbbf24] pl-3">
                      <span className="absolute -left-1.5 top-0 size-2.5 rounded-full bg-[#fbbf24]" />
                      <p className="text-xs font-bold text-[#1f1d1a]">Safaricom Ethiopia PLC</p>
                      <p className="text-[10px] text-muted">Data Analyst (2026 - Present)</p>
                    </div>
                    <div className="relative border-l-2 border-line pl-3">
                      <span className="absolute -left-1.5 top-0 size-2.5 rounded-full bg-line-strong" />
                      <p className="text-xs font-bold text-[#1f1d1a]">Addis Ababa University</p>
                      <p className="text-[10px] text-muted">B.Sc. Computer Engineering (CGPA 3.70)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer with Direct CTA */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time customizable in Studio</span>
            </div>

            <Link
              href={`/cv/?template=${selectedTemplate}&color=${encodeURIComponent(accentColor)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-fg shadow-xs transition hover:bg-surface hover:text-accent"
            >
              Open this in CV Studio
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
