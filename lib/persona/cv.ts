/**
 * The job persona's CV document (persona.document.data): the same shape as src/content/cv.ts. Edited in
 * the Studio, printed on /cv/ and into the PDF. Stored as loose JSON, so it is read field by field and
 * anything missing or malformed falls back to the code content.
 */

export type CvEngagement = { title: string; period: string; bullets: string[]; stack: string };
export type CvJob = { company: string; role: string; period: string; location: string; context: string; bullets: string[]; engagements: CvEngagement[] };
export type CvData = {
  showPhoto: boolean;
  title: string;
  availability: string;
  photo: string;
  profile: string;
  highlights: string[];
  skills: { k: string; v: string }[];
  experience: CvJob[];
  projects: { name: string; meta: string; text: string }[];
  education: { degree: string; school: string; year: string; note: string };
  courses: string[];
  languages: { name: string; level: string }[];
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
    projects: list(v.projects, fallback.projects, (r) => ({ name: str(r.name, ""), meta: str(r.meta, ""), text: str(r.text, "") })),
    education: { degree: str(edu.degree, fallback.education.degree), school: str(edu.school, fallback.education.school), year: str(edu.year, fallback.education.year), note: str(edu.note, fallback.education.note) },
    courses: strs(v.courses, fallback.courses),
    languages: list(v.languages, fallback.languages, (r) => ({ name: str(r.name, ""), level: str(r.level, "") })),
  };
}
