export const CV_TEMPLATES = [
  { id: "classic", name: "Classic Professional", description: "Traditional hierarchy and conventional headings for straightforward applications.", atsFriendly: true },
  { id: "modern", name: "Modern Minimal", description: "Elegant typography, calm spacing, and a restrained accent rule.", atsFriendly: true },
  { id: "executive-grid", name: "Executive", description: "A refined, information-dense design for experienced leaders and managers.", atsFriendly: true },
  { id: "wide-professional", name: "Technical / Software Engineer", description: "A clear technical profile with space for skills, projects, and delivery impact.", atsFriendly: true },
  { id: "editorial", name: "Creative Professional", description: "A distinctive editorial grid with a confident masthead and balanced detail.", atsFriendly: false },
  { id: "section-bands", name: "Graduate / Entry-Level", description: "A focused layout that gives education, projects, and early achievements room to shine.", atsFriendly: true },
  { id: "career-timeline", name: "Academic / Research", description: "A structured timeline for research, education, publications, and credentials.", atsFriendly: true },
  { id: "sidebar", name: "Corporate Two-Column", description: "A practical sidebar for contact details and skills beside an experience-led main column.", atsFriendly: true },
  { id: "compact", name: "Modern Compact", description: "Efficient spacing for a strong, information-rich professional CV.", atsFriendly: true },
  { id: "lavender-split", name: "Elegant Contemporary", description: "Refined two-column composition with balanced whitespace and soft visual detail.", atsFriendly: false },
  { id: "timeline", name: "Career Timeline", description: "A visual path through your career history.", atsFriendly: true },
  { id: "navy-rail", name: "Navy Profile Rail", description: "A dark profile column paired with a crisp white experience page.", atsFriendly: false },
  { id: "slate-sidebar", name: "Slate Sidebar", description: "A soft gray profile panel with centered section labels.", atsFriendly: true },

  { id: "orange-split", name: "Orange Split", description: "A portrait-led header with a light profile rail and clear experience column.", atsFriendly: false },
  { id: "navy-contrast", name: "Navy Contrast", description: "A dark profile rail with education and languages beside a light experience column.", atsFriendly: false },
  { id: "orange-frame", name: "Orange Frame", description: "A bright framed page with a photo-led header and clear section rules.", atsFriendly: false },
  { id: "reverse-rail", name: "Reverse Profile Rail", description: "A light experience page with a dark profile panel on the right.", atsFriendly: false },
  { id: "gold-timeline", name: "Gold Timeline", description: "A dark skills rail beside a gold-accented career timeline.", atsFriendly: false },
  { id: "studio-rail", name: "Studio Rail", description: "A photo-led navy sidebar with a structured experience column.", atsFriendly: false },
  { id: "teal-timeline", name: "Teal Timeline", description: "A deep teal profile rail beside a clear education and career timeline.", atsFriendly: false },
  { id: "cyan-timeline", name: "Cyan Timeline", description: "A vivid blue profile rail with cyan highlights and a structured work history.", atsFriendly: false },
  { id: "portrait-two-column", name: "Portrait Two-Column", description: "A portrait-led profile with skills and languages beside career details.", atsFriendly: false },
  { id: "mint-header", name: "Mint Header", description: "A teal masthead above a pale profile panel and an open experience column.", atsFriendly: false },
  { id: "minimalist", name: "Minimalist", description: "A compact, single-column CV with dates aligned to the right.", atsFriendly: true },
  { id: "centered-blue", name: "Centered Blue", description: "A centered, photo-free CV with blue ruled section headings.", atsFriendly: true },
  { id: "nordic-mono", name: "Nordic Minimalist", description: "Clean Swiss typographic grid with monospaced metadata, subtle tech badges, and high ATS compliance.", atsFriendly: true },
  { id: "devgrid", name: "Silicon Valley DevGrid", description: "Tech-lead layout with structured technical matrix, monospace metadata, and bold impact metrics.", atsFriendly: true },
  { id: "zurich-modern", name: "Zurich Executive", description: "Asymmetric corporate design with executive summary callout and dual modular columns.", atsFriendly: true },
  { id: "tokyo-minimal", name: "Tokyo Minimal", description: "Japanese Bauhaus layout with zen-like whitespace, geometric accent nodes, and right-aligned dates.", atsFriendly: true },
  { id: "emerald-executive", name: "Emerald Executive", description: "Luxury consulting layout with deep forest accents, leadership summary callout, and split columns.", atsFriendly: false },
] as const;

export type CvTemplateId = (typeof CV_TEMPLATES)[number]["id"];

export function isCvTemplateId(value: unknown): value is CvTemplateId {
  return typeof value === "string" && CV_TEMPLATES.some((template) => template.id === value);
}
