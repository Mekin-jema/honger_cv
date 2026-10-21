import "server-only";
import type { ImportedCv } from "./assist";

type ParserLocation = { city?: string | null; region?: string | null; country?: string | null; address?: string | null };
type ParserResponse = {
  success: boolean;
  error?: string | null;
  data?: {
    personal_info?: {
      name?: string;
      label?: string | null;
      email?: string | null;
      phone?: string | null;
      location?: ParserLocation | null;
      urls?: { type?: string | null; url: string; label?: string | null }[];
    };
    experience?: {
      company: string;
      title: string;
      start_date: string;
      end_date?: string | null;
      current?: boolean | null;
      description?: string | null;
      highlights?: string[];
      location?: ParserLocation | null;
    }[];
    education?: {
      institution: string;
      degree?: string | null;
      field_of_study?: string | null;
      graduation_date?: string | null;
      start_date?: string | null;
      gpa?: { value: number; max: number } | null;
      honors?: string | null;
      courses?: string[];
    }[];
    skills?: { skill: string; category?: string | null }[];
    certifications?: { name: string; issuer?: string | null; date?: string | null }[];
    languages?: { language: string; proficiency?: string | null; fluency?: string | null }[];
    projects?: { name: string; description?: string | null; role?: string | null; url?: string | null; technologies?: string[]; highlights?: string[] }[];
    awards?: { title: string; awarder?: string | null; date?: string | null; description?: string | null }[];
  } | null;
  metadata?: { extraction_method?: string; ocr_used?: boolean; pages?: number };
};

export class ResumeParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeParserError";
  }
}

const locationText = (location?: ParserLocation | null) =>
  [location?.city, location?.region, location?.country].filter(Boolean).join(", ") || location?.address || "";

const dateRange = (start?: string | null, end?: string | null, current?: boolean | null) =>
  [start, current ? "Present" : end].filter(Boolean).join(" – ");

/** Call the separately hosted Resume Parser API (PyMuPDF + validated parsing pipeline). */
export async function parseWithResumeParser(bytes: Uint8Array, filename: string): Promise<ImportedCv | null> {
  const baseUrl = process.env.RESUME_PARSER_API_URL?.trim();
  if (!baseUrl) return null;
  const apiKey = process.env.RESUME_PARSER_API_KEY?.trim();
  if (!apiKey) throw new ResumeParserError("Resume Parser is configured but RESUME_PARSER_API_KEY is missing.");

  let endpoint: URL;
  try {
    endpoint = new URL("/api/v1/parse", baseUrl);
  } catch {
    throw new ResumeParserError("RESUME_PARSER_API_URL must be a valid HTTPS URL.");
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
    throw new ResumeParserError("Resume Parser API must use HTTPS.");
  }

  const form = new FormData();
  form.set("file", new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" }), filename);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: form,
    signal: AbortSignal.timeout(50_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ResumeParserError(`Resume Parser returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  let result: ParserResponse;
  try {
    result = (await response.json()) as ParserResponse;
  } catch {
    throw new ResumeParserError("Resume Parser returned invalid JSON.");
  }
  const info = result.data?.personal_info;
  if (!result.success || !info) {
    throw new ResumeParserError(result.error || "Resume Parser could not extract CV fields.");
  }

  const data = result.data!;
  const skillsByCategory = new Map<string, string[]>();
  for (const skill of data.skills ?? []) {
    const category = skill.category?.trim() || "Skills";
    const values = skillsByCategory.get(category) ?? [];
    if (skill.skill?.trim()) values.push(skill.skill.trim());
    skillsByCategory.set(category, values);
  }
  const education = data.education ?? [];
  const firstEducation = education[0];
  const courses = [...new Set([
    ...education.flatMap((item) => item.courses ?? []),
    ...(data.certifications ?? []).map((item) => item.name),
  ])];

  return {
    identity: {
      name: info.name?.trim() || "",
      email: info.email?.trim() || "",
      phone: info.phone?.trim() || "",
      location: locationText(info.location),
      links: (info.urls ?? []).map((link) => ({ label: link.label || link.type || "Link", href: link.url })),
    },
    title: info.label?.trim() || "",
    profile: "",
    highlights: (data.awards ?? []).map((award) => [award.title, award.awarder, award.date].filter(Boolean).join(" · ")),
    skills: [...skillsByCategory].map(([k, values]) => ({ k, v: [...new Set(values)].join(", ") })),
    experience: (data.experience ?? []).map((job) => ({
      company: job.company,
      role: job.title,
      period: dateRange(job.start_date, job.end_date, job.current),
      location: locationText(job.location),
      context: job.description || "",
      bullets: job.highlights ?? [],
      engagements: [],
    })),
    projects: (data.projects ?? []).map((project) => ({
      name: project.name,
      meta: [project.role, ...(project.technologies ?? []), project.url].filter(Boolean).join(" · "),
      text: [project.description, ...(project.highlights ?? [])].filter(Boolean).join("\n"),
    })),
    education: {
      degree: [firstEducation?.degree, firstEducation?.field_of_study].filter(Boolean).join(" · "),
      school: firstEducation?.institution || "",
      year: firstEducation?.graduation_date || firstEducation?.start_date || "",
      note: [
        ...education.slice(1).map((item) => [item.degree, item.institution, item.graduation_date].filter(Boolean).join(" · ")),
        firstEducation?.gpa ? `GPA ${firstEducation.gpa.value}/${firstEducation.gpa.max}` : "",
        firstEducation?.honors || "",
      ].filter(Boolean).join("\n"),
    },
    courses,
    languages: (data.languages ?? []).map((language) => ({ name: language.language, level: language.fluency || language.proficiency || "" })),
  };
}
