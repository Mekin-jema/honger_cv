"use client";

import { useState, type CSSProperties } from "react";
import { Download } from "lucide-react";
import { CvSheet } from "@/components/document/cv-sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CvData } from "@/lib/persona/cv";
import { profile } from "@/content/profile";
import { withBase } from "@/lib/utils"
import { PrintButton } from "./print-button";

const templates = [
  { id: "modern", name: "Soft Modern", description: "A crisp profile with subtle color and gentle section rules." },
  { id: "classic", name: "Centered Serif", description: "A polished, traditional layout with a centered masthead." },
  { id: "section-bands", name: "Section Bands", description: "Compact sections with clear, centered gray headings." },
  { id: "executive-grid", name: "Executive Grid", description: "A compact, information-dense layout for experienced candidates." },
  { id: "sidebar", name: "Sidebar", description: "Contact and credentials alongside experience." },
  { id: "timeline", name: "Timeline", description: "A visual path through your career history." },
  { id: "editorial", name: "Editorial", description: "A magazine-inspired grid with a bold masthead." },
  { id: "compact", name: "Compact", description: "Tighter spacing for a shorter, denser CV." },
  { id: "navy-rail", name: "Navy Profile Rail", description: "A dark profile column paired with a crisp white experience page." },
  { id: "slate-sidebar", name: "Slate Sidebar", description: "A soft gray profile panel with centered section labels." },
  { id: "wide-professional", name: "Wide Professional", description: "A full-width header and date-led experience rows." },
  { id: "lavender-split", name: "Lavender Split", description: "A colorful two-column profile with a contrasting experience panel." },
  { id: "orange-split", name: "Orange Split", description: "A portrait-led header with a light profile rail and clear experience column." },
  { id: "navy-contrast", name: "Navy Contrast", description: "A dark profile rail with education and languages beside a light experience column." },
  { id: "orange-frame", name: "Orange Frame", description: "A bright framed page with a photo-led header and clear section rules." },
  { id: "reverse-rail", name: "Reverse Profile Rail", description: "A light experience page with a dark profile panel on the right." },
  { id: "gold-timeline", name: "Gold Timeline", description: "A dark skills rail beside a gold-accented career timeline." },
  { id: "career-timeline", name: "Career Timeline", description: "A clean white timeline with contact details and skills in a side column." },
  { id: "studio-rail", name: "Studio Rail", description: "A photo-led navy sidebar with a structured experience column." },
  { id: "teal-timeline", name: "Teal Timeline", description: "A deep teal profile rail beside a clear education and career timeline." },
  { id: "cyan-timeline", name: "Cyan Timeline", description: "A vivid blue profile rail with cyan highlights and a structured work history." },
  { id: "portrait-two-column", name: "Portrait Two-Column", description: "A portrait-led profile with skills and languages beside career details." },
  { id: "mint-header", name: "Mint Header", description: "A teal masthead above a pale profile panel and an open experience column." },
  { id: "minimalist", name: "Minimalist", description: "A compact, single-column CV with dates aligned to the right." },
  { id: "centered-blue", name: "Centered Blue", description: "A centered, photo-free CV with blue ruled section headings." },
] as const;

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

export function CvStudio({ cv }: { cv: CvData }) {
  const [template, setTemplate] = useState<(typeof templates)[number]["id"]>("modern");
  const [accentColor, setAccentColor] = useState<string>(palettes[1].color);
  const selectedTemplate = templates.find((item) => item.id === template) ?? templates[0];
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
        } as CSSProperties
      }
    >
      <nav aria-label="CV actions" className="cv-toolbar no-print">
        <div className="cv-toolbar-navigation">
          <SidebarTrigger className="cv-tool cv-sidebar-toggle" />
        </div>
        <div className="cv-toolbar-actions">
          <PrintButton label="Save selected PDF" />
          <a
            href={withBase(profile.cvPdf)}
            download
            className="cv-tool cv-tool-primary"
            aria-label="Download the original CV PDF without the selected design or color"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>Original PDF</span>
          </a>
        </div>
      </nav>

      <section className="cv-studio-heading no-print">
        <div>
          <p className="cv-studio-eyebrow">CV STUDIO</p>
          <h1>Choose your CV design</h1>
          <p>Select a template to preview your CV, then save that design as a PDF.</p>
        </div>
        <div className="cv-studio-heading-side">
          <span className="cv-page-format">A4 · Print-ready</span>
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
                  onClick={() => setAccentColor(item.color)}
                />
              ))}
              <label className="cv-custom-color">
                <input
                  type="color"
                  value={accentColor}
                  aria-label="Choose any custom accent color"
                  title="Choose any custom accent color"
                  onChange={(event) => setAccentColor(event.target.value)}
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
            <span className="cv-template-count">{templates.length}</span>
          </div>
          <div className="cv-template-grid" role="group" aria-label="CV design options">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cv-template-card${template === item.id ? " is-selected" : ""}`}
                aria-pressed={template === item.id}
                onClick={() => setTemplate(item.id)}
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
