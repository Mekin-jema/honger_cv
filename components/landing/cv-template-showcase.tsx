"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { CvSheet, cvSheetLayoutForTemplate, cvTemplateStyle } from "@/components/document/cv-sheet";
import type { CvData } from "@/lib/persona/cv";
import {
  TEMPLATE_ITEMS,
  TEMPLATE_CATEGORIES,
  PALETTES,
  type TemplateCategory,
} from "./landing-data";

export function CvTemplateShowcase({ cv }: { cv: CvData }) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accentColor, setAccentColor] = useState("#b5400f");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  const templateStageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.8);

  const filteredTemplates = useMemo(
    () => activeCategory === "all" ? TEMPLATE_ITEMS : TEMPLATE_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory],
  );
  const currentTemplate = filteredTemplates[currentIndex] ?? filteredTemplates[0];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % filteredTemplates.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [filteredTemplates.length, isPlaying]);

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    const activeButton = rail?.children[currentIndex] as HTMLElement | undefined;
    if (!rail || !activeButton) return;

    const railRect = rail.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    const centeredLeft =
      rail.scrollLeft + activeRect.left - railRect.left - (rail.clientWidth - activeButton.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, centeredLeft), behavior: "smooth" });
  }, [currentIndex]);

  useEffect(() => {
    templateStageRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeCategory, currentTemplate.id]);

  useEffect(() => {
    const stage = templateStageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const nextScale = Math.min(0.8, Math.max(0.35, (stage.clientWidth - 16) / 793.7));
      setPreviewScale((current) => Math.abs(current - nextScale) < 0.005 ? current : nextScale);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const selectCategory = (category: TemplateCategory) => {
    setActiveCategory(category);
    setCurrentIndex(0);
  };

  const selectTemplate = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  };

  const copyTemplateLink = async () => {
    const url = `${window.location.origin}/cv/?template=${currentTemplate.id}&color=${encodeURIComponent(accentColor)}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <section id="templates" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <Sparkles className="size-4" aria-hidden="true" />
            Interactive CV studio preview
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Explore 25+ Handcrafted Layouts
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
            Slide through every signature template, test live accent colors, and see how your experience will look in print.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((playing) => !playing)}
            aria-label={isPlaying ? "Pause template previews" : "Play template previews"}
            title={isPlaying ? "Pause auto-slide" : "Start auto-slide"}
            className="grid size-10 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            {isPlaying ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => selectTemplate((currentIndex - 1 + filteredTemplates.length) % filteredTemplates.length)}
              aria-label="Previous template"
              className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center font-mono text-xs font-semibold text-muted">
              {String(currentIndex + 1).padStart(2, "0")} / {String(filteredTemplates.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => selectTemplate((currentIndex + 1) % filteredTemplates.length)}
              aria-label="Next template"
              className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="no-scrollbar mt-8 flex items-center gap-2 overflow-x-auto border-b border-line pb-3">
        {TEMPLATE_CATEGORIES.map((category) => {
          const active = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectCategory(category.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                active ? "bg-fg text-bg" : "border border-line bg-card text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              {category.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-bg/15 text-bg" : "bg-surface text-muted"}`}>
                {category.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 rounded-xl border border-line bg-card p-3 shadow-[var(--card-shadow)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="text-xs font-semibold text-fg">{currentTemplate.name} Preview</span>
              {currentTemplate.badge && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
                  {currentTemplate.badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="hidden font-mono text-[11px] sm:inline">{currentTemplate.layoutStyle}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" aria-hidden="true" /> ATS {currentTemplate.atsScore}%
              </span>
            </div>
          </div>

          <div ref={templateStageRef} className="cv-template-stage mt-4 rounded-lg border border-line bg-surface">
            <div
              className="cv-root cv-inline-preview cv-template-paper"
              data-template={currentTemplate.id}
              style={{ ...cvTemplateStyle(accentColor), "--cv-inline-scale": previewScale } as CSSProperties}
            >
              <CvSheet cv={cv} layout={cvSheetLayoutForTemplate(currentTemplate.id)} />
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-card p-5 shadow-[var(--card-shadow)] sm:p-7">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                {currentTemplate.categoryLabel}
              </span>
              <span className="font-mono text-xs text-muted">
                Template {String(currentIndex + 1).padStart(2, "0")} of {String(filteredTemplates.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{currentTemplate.name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{currentTemplate.description}</p>
          </div>

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

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Accent palette</p>
              <span className="font-mono text-xs text-muted">{accentColor}</span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-7">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  aria-label={`Select ${palette.name} accent`}
                  aria-pressed={accentColor === palette.color}
                  title={`${palette.name} (${palette.desc})`}
                  onClick={() => setAccentColor(palette.color)}
                  className={`grid aspect-square min-w-0 place-items-center rounded-md transition-colors ${
                    accentColor === palette.color ? "bg-surface ring-2 ring-fg" : "hover:bg-surface"
                  }`}
                >
                  <span className="size-5 rounded-full" style={{ backgroundColor: palette.color }} />
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2 text-xs text-muted">
            <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />ATS Parsed & Verified (Greenhouse, Lever, Workday)</li>
            <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />Pixel-perfect A4 vector print PDF calibration</li>
            <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />Custom hex color theming with WCAG AA compliance</li>
          </ul>

          <div className="space-y-2 pt-1">
            <Link
              href={`/cv/?template=${currentTemplate.id}&color=${encodeURIComponent(accentColor)}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-center text-sm font-bold text-on-accent transition hover:brightness-95"
            >
              Use {currentTemplate.name} in CV Studio <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={copyTemplateLink}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface/50 px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              {isCopied ? <><Check className="size-3.5 text-emerald-600" />Copied link to this template</> : "Share or copy link to this template"}
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">All {filteredTemplates.length} templates in this category</p>
          <span className="text-xs text-muted">Select one to preview</span>
        </div>
        <div ref={thumbnailRailRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-4 pt-1">
          {filteredTemplates.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={index === currentIndex}
              onClick={() => selectTemplate(index)}
              className={`group flex w-44 shrink-0 flex-col rounded-lg border p-2.5 text-left transition-colors ${
                index === currentIndex
                  ? "border-accent bg-accent-soft/30 ring-1 ring-accent"
                  : "border-line bg-card hover:border-line-strong hover:bg-surface/50"
              }`}
            >
              <span className="cv-template-art !min-h-[4.5rem] !rounded-md !border !border-line/60 !p-2" data-template-art={item.id} aria-hidden="true">
                <span className="cv-art-rail" />
                <span className="cv-art-photo" />
                <span className="cv-art-header" />
                <span className="cv-art-title" />
                <span className="cv-art-line" />
                <span className="cv-art-section" />
                <span className="cv-art-lines" />
                <span className="cv-art-date" />
                <span className="cv-art-section cv-art-section-short" />
                <span className="cv-art-lines cv-art-lines-short" />
              </span>
              <span className="mt-2 truncate text-xs font-bold text-fg group-hover:text-accent">{item.name}</span>
              <span className="truncate text-[10px] text-muted">{item.categoryLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}