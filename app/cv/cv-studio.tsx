"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { CvSheet } from "@/components/document/cv-sheet";
import type { CvData } from "@/lib/persona/cv";
import { profile } from "@/content/profile";
import { withBase } from "@/lib/utils";
import { PrintButton } from "./print-button";

const templates = [
  { id: "modern", name: "Modern" },
  { id: "classic", name: "Classic" },
  { id: "sidebar", name: "Sidebar" },
  { id: "timeline", name: "Timeline" },
  { id: "editorial", name: "Editorial" },
  { id: "compact", name: "Compact" },
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
        <Link href="/" className="cv-tool" aria-label="Back to chat">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to chat</span>
        </Link>
        <div className="cv-toolbar-settings">
          <label className="cv-layout-picker">
            <span>Design</span>
            <select
              value={template}
              onChange={(event) => {
                const selected = templates.find((item) => item.id === event.target.value);
                if (selected) setTemplate(selected.id);
              }}
              aria-label="CV design"
            >
              {templates.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <fieldset className="cv-color-picker">
            <legend>Color</legend>
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
        <span className="cv-page-format">A4 · Print-ready</span>
      </section>

      <section className="cv-preview-panel" aria-label="Live CV preview">
          <div className="cv-preview-heading no-print">
            <div>
              <h2>Live preview</h2>
              <p>{selectedTemplate.name} design · {selectedPalette.name} accent · Updates as you choose</p>
            </div>
            <span className="cv-preview-status"><span aria-hidden="true" /> Ready to save</span>
          </div>

          <main aria-label={`${selectedTemplate.name} CV preview`}>
            <CvSheet cv={cv} />
          </main>
      </section>
    </div>
  );
}
