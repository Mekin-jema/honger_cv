/**
 * The job persona's CV document (persona.document.data): the same shape as src/content/cv.ts. Edited in
 * the Studio, printed on /cv/ and into the PDF. Stored as loose JSON, so it is read field by field and
 * anything missing or malformed falls back to the code content.
 */

import type { Lang } from "./types";
import type { PersonaDoc } from "./schema";
import { lt } from "./text";

export type CvEngagement = { title: string; period: string; bullets: string[]; stack: string };
export type CvJob = { company: string; role: string; period: string; location: string; context: string; bullets: string[]; engagements: CvEngagement[] };
export type CvIdentity = {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  photo?: string;
  links: { label: string; href: string }[];
};
export type CvProject = { name: string; meta: string; text: string; image?: string; imagePublicId?: string };
export type CvData = {
  showPhoto: boolean;
  title: string;
  availability: string;
  photo: string;
  photoPublicId?: string;
  profile: string;
  highlights: string[];
  skills: { k: string; v: string }[];
  experience: CvJob[];
  projects: CvProject[];
  education: { degree: string; school: string; year: string; note: string };
  courses: string[];
  languages: { name: string; level: string }[];
  identity?: CvIdentity;
};

const emptyCv: CvData = {
  showPhoto: true,
  title: "",
  availability: "",
  photo: "",
  photoPublicId: "",
  profile: "",
  highlights: [],
  skills: [],
  experience: [],
  projects: [],
  education: { degree: "", school: "", year: "", note: "" },
  courses: [],
  languages: [],
};

type Rec = Record<string, unknown>;
const rec = (x: unknown): Rec => (x && typeof x === "object" && !Array.isArray(x) ? (x as Rec) : {});
const str = (x: unknown, d: string) => (typeof x === "string" ? x : d);
const strs = (x: unknown, d: string[]) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : d);
const list = <T>(x: unknown, d: T[], one: (r: Rec) => T) => (Array.isArray(x) ? x.map((v) => one(rec(v))) : d);

export function readCv(value: unknown, fallback: CvData): CvData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const v = value as Rec;
  const edu = rec(v.education);
  return {
    showPhoto: typeof v.showPhoto === "boolean" ? v.showPhoto : fallback.showPhoto,
    title: str(v.title, fallback.title),
    availability: str(v.availability, fallback.availability),
    photo: str(v.photo, fallback.photo),
    photoPublicId: str(v.photoPublicId, fallback.photoPublicId ?? ""),
    profile: str(v.profile, fallback.profile),
    highlights: strs(v.highlights, fallback.highlights),
    skills: list(v.skills, fallback.skills, (r) => ({ k: str(r.k, ""), v: str(r.v, "") })),
    experience: list(v.experience, fallback.experience, (r) => ({
      company: str(r.company, ""),
      role: str(r.role, ""),
      period: str(r.period, ""),
      location: str(r.location, ""),
      context: str(r.context, ""),
      bullets: strs(r.bullets, []),
      engagements: list(r.engagements, [], (e) => ({ title: str(e.title, ""), period: str(e.period, ""), bullets: strs(e.bullets, []), stack: str(e.stack, "") })),
    })),
    projects: list(v.projects, fallback.projects, (r) => ({
      name: str(r.name, ""),
      meta: str(r.meta, ""),
      text: str(r.text, ""),
      image: str(r.image, "") || undefined,
      imagePublicId: str(r.imagePublicId, "") || undefined,
    })),
    education: { degree: str(edu.degree, fallback.education.degree), school: str(edu.school, fallback.education.school), year: str(edu.year, fallback.education.year), note: str(edu.note, fallback.education.note) },
    courses: strs(v.courses, fallback.courses),
    languages: list(v.languages, fallback.languages, (r) => ({ name: str(r.name, ""), level: str(r.level, "") })),
  };
}

function itemText(item: PersonaDoc["sections"][number]["items"][number], lang: Lang) {
  return lt(item.text, lang) || lt(item.value, lang) || lt(item.label, lang);
}

export function personaToCvData(doc: PersonaDoc, lang: Lang): CvData {
  const section = (key: string) => {
    const found = doc.sections.find((item) => item.key === key && item.visibility === "public");
    return found?.items.filter((item) => !item.visibility || item.visibility === "public") ?? [];
  };
  const bullets = (item: PersonaDoc["sections"][number]["items"][number]) =>
    (item.details ?? []).map((detail) => lt(detail, lang)).filter(Boolean);
  const education = section("education");
  const cvIdentity: CvIdentity = {
    name: doc.identity.name,
    email: doc.identity.email,
    phone: doc.identity.phone,
    location: lt(doc.identity.location, lang),
    photo: doc.identity.avatar?.src ?? doc.identity.photos.find((photo) => photo.visibility === "public")?.src,
    links: doc.identity.links.map(({ label, href }) => ({ label, href })),
  };

  const derived: CvData = {
    showPhoto: doc.document.showPhoto,
    title: lt(doc.identity.role ?? doc.identity.headline, lang) || "Professional profile",
    availability: doc.availability.show ? "Open to new opportunities" : "",
    photo: cvIdentity.photo ?? "",
    profile: lt(doc.identity.summary, lang),
    highlights: section("highlights").map((item) => itemText(item, lang)).filter(Boolean),
    skills: section("skills").map((item) => ({
      k: lt(item.label, lang) || item.tags?.[0] || itemText(item, lang),
      v: lt(item.value, lang) || item.tags?.slice(1).join(", ") || "",
    })).filter((item) => item.k || item.v),
    experience: section("experience").map((item) => ({
      company: lt(item.meta, lang),
      role: lt(item.label, lang) || itemText(item, lang),
      period: item.period ?? "",
      location: "",
      context: "",
      bullets: bullets(item),
      engagements: (item.sub ?? []).map((entry) => ({
        title: lt(entry.title, lang),
        period: entry.period ?? "",
        bullets: entry.details.map((detail) => lt(detail, lang)),
        stack: "",
      })),
    })).filter((item) => item.role || item.company || item.bullets.length),
    projects: section("projects").map((item) => ({
      name: lt(item.label, lang) || itemText(item, lang),
      meta: lt(item.meta, lang) || item.period || "",
      text: lt(item.value, lang) || (item.details ?? []).map((detail) => lt(detail, lang)).join(" "),
      image: item.src,
    })).filter((item) => item.name || item.text),
    education: {
      degree: education[0] ? lt(education[0].label, lang) || itemText(education[0], lang) : "",
      school: education[0] ? lt(education[0].meta, lang) : "",
      year: education[0]?.period ?? "",
      note: education[0] ? lt(education[0].value, lang) || bullets(education[0]).join(" ") : "",
    },
    courses: education.slice(1).map((item) => itemText(item, lang)).filter(Boolean),
    languages: section("languages").map((item) => ({
      name: lt(item.label, lang) || itemText(item, lang),
      level: lt(item.value, lang),
    })).filter((item) => item.name || item.level),
    identity: cvIdentity,
  };
  return { ...readCv(doc.document.data, derived), identity: cvIdentity };
}

/** CV-only knowledge saved from the form, excluding contact and design metadata. */
export function cvKnowledge(doc: PersonaDoc, lang: Lang): Record<string, unknown> {
  const cv = personaToCvData(doc, lang);
  return {
    profile: cv.profile,
    highlights: cv.highlights.filter(Boolean),
    skills: cv.skills.filter((item) => item.k || item.v),
    experience: cv.experience
      .map((job) => ({ ...job, bullets: job.bullets.filter(Boolean) }))
      .filter((job) => job.role || job.company || job.bullets.length || job.engagements.length),
    projects: cv.projects.filter((project) => project.name || project.text),
    education: Object.fromEntries(Object.entries(cv.education).filter(([, value]) => !!value)),
    courses: cv.courses.filter(Boolean),
    languages: cv.languages.filter((item) => item.name || item.level),
  };
}

export function hasCvKnowledge(doc: PersonaDoc): boolean {
  const cv = readCv(doc.document.data, emptyCv);
  return !!(
    cv.profile.trim() ||
    cv.highlights.some((item) => item.trim()) ||
    cv.skills.some((item) => item.k.trim() || item.v.trim()) ||
    cv.experience.some((job) =>
      job.company.trim() ||
      job.role.trim() ||
      job.bullets.some((item) => item.trim()) ||
      job.engagements.some((item) => item.title.trim() || item.bullets.some((bullet) => bullet.trim())),
    ) ||
    cv.projects.some((project) => project.name.trim() || project.meta.trim() || project.text.trim()) ||
    Object.values(cv.education).some((value) => value.trim()) ||
    cv.courses.some((item) => item.trim()) ||
    cv.languages.some((item) => item.name.trim() || item.level.trim())
  );
}
