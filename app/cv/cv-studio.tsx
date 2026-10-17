"use client";

import { useState, type CSSProperties } from "react";
import { Download } from "lucide-react";
import { CvSheet } from "@/components/document/cv-sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CvData } from "@/lib/persona/cv";
import { profile } from "@/content/profile";
import { withBase } from "@/lib/utils";
import { PrintButton } from "./print-button";

const templates = [
  { id: "modern", name: "Modern", description: "The current clean, balanced layout." },
  { id: "classic", name: "Classic", description: "Traditional typography and a familiar reading flow." },
  { id: "sidebar", name: "Sidebar", description: "Contact and credentials alongside experience." },
  { id: "timeline", name: "Timeline", description: "A visual path through your career history." },
  { id: "editorial", name: "Editorial", description: "A magazine-inspired grid with a bold masthead." },
  { id: "compact", name: "Compact", description: "Tighter spacing for a shorter, denser CV." },
  { id: "navy-rail", name: "Navy Profile Rail", description: "A dark profile column paired with a crisp white experience page." },
] as const;

const palettes = [
  { id: "cobalt", name: "Cobalt", color: "#2855c5" },
  { id: "terracotta", name: "Terracotta", color: "#b5400f" },
  { id: "forest", name: "Forest", color: "#18745e" },
  { id: "plum", name: "Plum", color: "#7b3fa1" },
  { id: "slate", name: "Slate", color: "#475569" },
] as const;

export function CvStudio({ cv }: { cv: CvData }) {
  const [template, setTemplate] = useState<(typeof templates)[number]["id"]>("modern");
  const [palette, setPalette] = useState<(typeof palettes)[number]["id"]>("terracotta");
  const selectedTemplate = templates.find((item) => item.id === template) ?? templates[0];
  const selectedPalette = palettes.find((item) => item.id === palette) ?? palettes[0];

  return (
    <div className="cv-root" data-template={template} data-color={palette}>
      <nav aria-label="CV actions" className="cv-toolbar no-print">
        <div className="cv-toolbar-navigation">
          <SidebarTrigger className="cv-tool cv-sidebar-toggle" />
        </div>
        <div className="cv-toolbar-actions">
          <PrintButton label="Save as PDF" />
          <a
            href={withBase(profile.cvPdf)}
            download
            className="cv-tool cv-tool-primary"
            aria-label="Download the original CV PDF"
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
                  className={`cv-color-swatch${palette === item.id ? " is-selected" : ""}`}
                  style={{ "--swatch-color": item.color } as CSSProperties}
                  aria-label={`${item.name} color`}
                  aria-pressed={palette === item.id}
                  title={item.name}
                  onClick={() => setPalette(item.id)}
                />
              ))}
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
                  <span className="cv-art-header" />
                  <span className="cv-art-title" />
                  <span className="cv-art-line" />
                  <span className="cv-art-section" />
                  <span className="cv-art-lines" />
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
              <p>{selectedTemplate.name} design · {selectedPalette.name} accent · Updates as you choose</p>
            </div>
            <span className="cv-preview-status"><span aria-hidden="true" /> Ready to save</span>
          </div>

          <main aria-label={`${selectedTemplate.name} CV preview`}>
            <CvSheet cv={cv} layout={template === "navy-rail" ? "navy-rail" : "default"} />
          </main>
        </section>
      </div>
    </div>
  );
}
