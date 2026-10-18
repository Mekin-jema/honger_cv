export const CV_TEMPLATES = [
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

export type CvTemplateId = (typeof CV_TEMPLATES)[number]["id"];

export function isCvTemplateId(value: unknown): value is CvTemplateId {
  return typeof value === "string" && CV_TEMPLATES.some((template) => template.id === value);
}
