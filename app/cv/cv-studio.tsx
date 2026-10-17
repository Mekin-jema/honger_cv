"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { CvSheet } from "@/components/document/cv-sheet";
import type { CvData } from "@/lib/persona/cv";
import { profile } from "@/content/profile";
import { withBase } from "@/lib/utils";
import { PrintButton } from "./print-button";

const templates = [
  { id: "modern", name: "Modern", description: "Clean blue accents and a sharp, contemporary header." },
  { id: "classic", name: "Classic", description: "A balanced, traditional layout for any application." },
  { id: "executive", name: "Executive", description: "Confident navy styling with a structured profile." },
  { id: "minimal", name: "Minimal", description: "Quiet typography and subtle lines keep the focus on content." },
  { id: "creative", name: "Creative", description: "A distinctive teal palette with a softer, personal feel." },
  { id: "compact", name: "Compact", description: "Tighter spacing to fit more detail on fewer pages." },
] as const;

export function CvStudio({ cv }: { cv: CvData }) {
  const [template, setTemplate] = useState<(typeof templates)[number]["id"]>("modern");
  const selectedTemplate = templates.find((item) => item.id === template) ?? templates[0];

  return (
    <div className="cv-root" data-template={template}>
      <nav aria-label="CV actions" className="cv-toolbar no-print">
        <Link href="/" className="cv-tool" aria-label="Back to chat">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to chat</span>
        </Link>
        <div className="flex items-center gap-2">
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

      <div className="cv-studio-layout">
        <section className="cv-template-section no-print" aria-labelledby="cv-template-heading">
          <div className="cv-template-heading">
            <div>
              <h2 id="cv-template-heading">Templates</h2>
              <p>Choose a style. Your CV content stays the same.</p>
            </div>
            <p className="cv-template-count">6 designs</p>
          </div>
          <div className="cv-template-grid" role="group" aria-label="Choose a CV template">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cv-template-card${template === item.id ? " is-selected" : ""}`}
                aria-pressed={template === item.id}
                onClick={() => setTemplate(item.id)}
              >
                <span className={`cv-template-art cv-template-art-${item.id}`} aria-hidden="true">
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
        </section>

        <section className="cv-preview-panel" aria-label="Live CV preview">
          <div className="cv-preview-heading no-print">
            <div>
              <h2>Live preview</h2>
              <p>{selectedTemplate.name} template · Changes apply immediately</p>
            </div>
            <span className="cv-preview-status"><span aria-hidden="true" /> Ready to save</span>
          </div>

          <main aria-label={`${selectedTemplate.name} CV preview`}>
            <CvSheet cv={cv} />
          </main>
        </section>
      </div>
    </div>
  );
}
