"use client";

import { useState, type CSSProperties } from "react";
import { CvSheet } from "@/components/document/cv-sheet";
import { ThemeToggle } from "@/components/theme-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CvData } from "@/lib/persona/cv";
import { CV_TEMPLATES, type CvTemplateId } from "@/lib/persona/cv-templates";
import { PrintButton } from "./print-button";

const palettes = [
  { id: "cobalt", name: "Cobalt", color: "#2855c5" },
  { id: "terracotta", name: "Terracotta", color: "#b5400f" },
  { id: "forest", name: "Forest", color: "#18745e" },
  { id: "plum", name: "Plum", color: "#7b3fa1" },
  { id: "slate", name: "Slate", color: "#475569" },
  { id: "ocean", name: "Ocean", color: "#087e8b" },
  { id: "rose", name: "Rose", color: "#be456b" },
  { id: "amber", name: "Amber", color: "#a65b00" },
  { id: "indigo", name: "Indigo", color: "#5145a8" },
  { id: "emerald", name: "Emerald", color: "#238636" },
  { id: "coral", name: "Coral", color: "#d44a3a" },
  { id: "teal", name: "Teal", color: "#087f68" },
  { id: "berry", name: "Berry", color: "#a12f79" },
] as const;

export type CvDesign = { template: CvTemplateId; accentColor: string };

export function CvStudio({
  cv,
  initialTemplate = "modern",
  initialAccentColor = palettes[1].color,
  onDesignChange,
  onPrint,
  showSidebarToggle = true,
}: {
  cv: CvData;
  initialTemplate?: CvTemplateId;
  initialAccentColor?: string;
  onDesignChange?: (design: CvDesign) => void;
  onPrint?: () => void;
  showSidebarToggle?: boolean;
}) {
  const [template, setTemplate] = useState<CvTemplateId>(initialTemplate);
  const [accentColor, setAccentColor] = useState<string>(initialAccentColor);
  const selectTemplate = (next: CvTemplateId) => {
    setTemplate(next);
    onDesignChange?.({ template: next, accentColor });
  };
  const selectAccent = (next: string) => {
    setAccentColor(next);
    onDesignChange?.({ template, accentColor: next });
  };
  const selectedTemplate = CV_TEMPLATES.find((item) => item.id === template) ?? CV_TEMPLATES[0];
  const selectedPalette = palettes.find((item) => item.color === accentColor);

  return (
    <div
      className="cv-root"
      data-template={template}
      data-color={selectedPalette?.id ?? "custom"}
      style={
        {
          "--cv-accent": accentColor,
          "--cv-line": `color-mix(in srgb, ${accentColor} 25%, #fff)`,
          "--cv-rail-dark": `color-mix(in srgb, ${accentColor} 32%, #1c3443)`,
          "--cv-rail-light": `color-mix(in srgb, ${accentColor} 13%, #f1f4f7)`,
          "--cv-rail-light-warm": `color-mix(in srgb, ${accentColor} 12%, #fffdfa)`,
          "--cv-rail-light-mint": `color-mix(in srgb, ${accentColor} 12%, #eaf5f1)`,
        } as CSSProperties
      }
    >
      <section className="cv-studio-heading no-print">
        <div className="cv-studio-heading-main">
          {showSidebarToggle && <SidebarTrigger className="cv-tool cv-sidebar-toggle" aria-label="Toggle sidebar" />}
          <ThemeToggle className="cv-tool cv-theme-toggle" />
          <div className="cv-studio-heading-copy">
            <p className="cv-studio-eyebrow">CV STUDIO</p>
            <h1>Choose your CV design</h1>
            <p>Select a template to preview your CV, then save that design as a PDF.</p>
          </div>
        </div>
        <div className="cv-studio-heading-side">
          <PrintButton label="Save selected PDF" className="cv-tool-primary" onPrint={onPrint} />
          <fieldset className="cv-color-picker cv-heading-color-picker">
            <legend>Accent color</legend>
            <div className="cv-color-options">
              {palettes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cv-color-swatch${accentColor === item.color ? " is-selected" : ""}`}
                  style={{ "--swatch-color": item.color } as CSSProperties}
                  aria-label={`${item.name} color ${item.color}`}
                  aria-pressed={accentColor === item.color}
                  title={item.name}
                  onClick={() => selectAccent(item.color)}
                />
              ))}
              <label className="cv-custom-color">
                <input
                  type="color"
                  value={accentColor}
                  aria-label="Choose any custom accent color"
                  title="Choose any custom accent color"
                  onChange={(event) => selectAccent(event.target.value)}
                />
                <span>Custom</span>
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <div className="cv-studio-layout">
        <aside className="cv-template-section no-print" aria-labelledby="cv-template-heading">
          <div className="cv-template-heading">
            <div>
              <h2 id="cv-template-heading">Choose a layout</h2>
              <p>Pick a design to update the preview.</p>
            </div>
            <span className="cv-template-count">{CV_TEMPLATES.length}</span>
          </div>
          <div className="cv-template-grid" role="group" aria-label="CV design options">
            {CV_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cv-template-card${template === item.id ? " is-selected" : ""}`}
                aria-pressed={template === item.id}
                onClick={() => selectTemplate(item.id)}
              >
                <span className="cv-template-art" data-template-art={item.id} aria-hidden="true">
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
                <span className="cv-template-copy">
                  <span className="cv-template-name">
                    {item.name}
                    {template === item.id && <span className="cv-selected-badge">Selected</span>}
                  </span>
                  <span className="cv-template-description">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="cv-preview-panel" aria-label="Live CV preview">
          <div className="cv-preview-heading no-print">
            <div>
              <h2>Live preview</h2>
              <p>
                {selectedTemplate.name} design · {selectedPalette?.name ?? accentColor.toUpperCase()} accent · Updates as you choose
              </p>
            </div>
            <span className="cv-preview-status"><span aria-hidden="true" /> Ready to save</span>
          </div>

          <main aria-label={`${selectedTemplate.name} CV preview`}>
            <CvSheet
              cv={cv}
              layout={
                template === "teal-timeline" || template === "cyan-timeline"
                  ? "gold-timeline"
                  : template === "portrait-two-column"
                    ? "orange-split"
                    : template === "navy-rail" ||
                template === "slate-sidebar" ||
                template === "wide-professional" ||
                template === "lavender-split" ||
                template === "orange-split" ||
                template === "navy-contrast" ||
                template === "orange-frame" ||
                template === "reverse-rail" ||
                template === "gold-timeline" ||
                template === "career-timeline" ||
                template === "studio-rail" ||
                template === "mint-header" ||
                template === "minimalist" ||
                template === "centered-blue"
                  ? template
                  : "default"
              }
            />
          </main>
        </section>
      </div>
    </div>
  );
}
