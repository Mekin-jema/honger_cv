import type { ImportedCv } from "@/server/brain/assist";
import { parseWithResumeParser } from "@/server/brain/resume-parser";
import { bad, json, limited, sameOrigin } from "@/server/http";
import { doclingParser } from "@/server/services/document-parser";
import { DocumentParserError } from "@/server/services/document-parser/types";
import type { StructuredCvData } from "@/server/services/cv-extractor/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 15_000_000; // 15 MB

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
};

function sanitizeFilename(raw: string): string {
  const base = raw.replace(/^.*[/\\]/, "").trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 120) || "uploaded-cv.pdf";
}

function validateMagicBytes(bytes: Uint8Array, extension: string): boolean {
  if (extension === "pdf") {
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    return header === "%PDF-";
  }
  if (extension === "docx" || extension === "pptx") {
    // ZIP magic bytes: PK\x03\x04
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  if (extension === "txt" || extension === "md" || extension === "markdown") {
    // Should be valid text without excessive null bytes
    let nullCount = 0;
    const checkLen = Math.min(bytes.length, 512);
    for (let i = 0; i < checkLen; i++) {
      if (bytes[i] === 0) nullCount++;
    }
    return nullCount === 0;
  }
  return true;
}

function importedCvToMarkdown(cv: ImportedCv): string {
  const identity = cv.identity ?? { name: "", links: [] };
  const sections: string[] = [];

  if (identity.name) sections.push(`# ${identity.name}`);
  const contact: string[] = [];
  if (identity.email) contact.push(identity.email);
  if (identity.phone) contact.push(identity.phone);
  if (identity.location) contact.push(identity.location);
  if (identity.links.length > 0) {
    contact.push(...identity.links.map((link) => `${link.label || "Link"}: ${link.href}`));
  }
  if (contact.length) sections.push(contact.join(" • "));

  if (cv.title) sections.push(`## Title\n${cv.title}`);
  if (cv.profile) sections.push(`## Profile\n${cv.profile}`);

  if (cv.highlights.length) {
    sections.push(`## Highlights\n- ${cv.highlights.map((item) => item.trim()).filter(Boolean).join("\n- ")}`);
  }

  if (cv.skills.length) {
    sections.push(
      `## Skills\n${cv.skills
        .map((skill) => `${skill.k}${skill.v ? `: ${skill.v}` : ""}`)
        .filter(Boolean)
        .join("\n")}`,
    );
  }

  if (cv.experience.length) {
    sections.push(
      `## Experience\n${cv.experience
        .map(
          (job) =>
            `- ${job.role || job.company || "Role"}${job.company ? ` @ ${job.company}` : ""}${job.period ? ` (${job.period})` : ""}\n${job.context || ""}${job.bullets.length ? `\n${job.bullets.map((bullet) => `  - ${bullet}`).join("\n")}` : ""}`,
        )
        .join("\n")}`,
    );
  }

  if (cv.projects.length) {
    sections.push(
      `## Projects\n${cv.projects
        .map((project) => `- ${project.name}${project.meta ? ` (${project.meta})` : ""}\n${project.text}`)
        .join("\n")}`,
    );
  }

  if (cv.education.degree || cv.education.school || cv.education.year || cv.education.note) {
    sections.push(
      `## Education\n${[cv.education.degree, cv.education.school, cv.education.year].filter(Boolean).join(" · ")}\n${cv.education.note || ""}`,
    );
  }

  if (cv.courses.length) sections.push(`## Courses\n- ${cv.courses.join("\n- ")}`);

  if (cv.languages.length) {
    sections.push(`## Languages\n${cv.languages.map((lang) => `- ${lang.name}${lang.level ? `: ${lang.level}` : ""}`).join("\n")}`);
  }

  return sections.join("\n\n").trim() || "CV content";
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return bad("Cross-origin requests are not allowed.", 403);
  }

  if (limited("cv:parse", 20, 10 * 60_000)) {
    return bad("Too many document uploads. Please wait a few minutes before trying again.", 429);
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES + 500_000) {
    return bad("This document is too large. Choose a file under 15 MB.", 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Could not read the uploaded form. Please select a valid document and try again.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("No CV file was attached. Select a PDF, DOCX, TXT, or Markdown file and try again.", 400);
  if (!file.size) return bad("The selected CV file is empty (0 bytes). Choose a non-empty copy and try again.", 400);

  if (file.size > MAX_FILE_BYTES) {
    return bad("This document is too large. Choose a file under 15 MB.", 413);
  }

  const safeName = sanitizeFilename(file.name);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";

  const mimeType = MIME_MAP[ext] || file.type || "application/octet-stream";
  if (!MIME_MAP[ext]) {
    return bad("Unsupported file type. Please upload a PDF, DOCX, PPTX, TXT, or Markdown document.", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validateMagicBytes(bytes, ext)) {
    return bad(`This file does not appear to be a valid or uncorrupted ${ext.toUpperCase()} document.`, 422);
  }

  try {
    let resumeApiParsed: ImportedCv | null = null;
    try {
      resumeApiParsed = await parseWithResumeParser(bytes, safeName);
    } catch (err: unknown) {
      console.warn(`[api/cv/parse] Resume parser unavailable for ${safeName}:`, err instanceof Error ? `${err.name}: ${err.message}` : err);
    }

    if (resumeApiParsed) {
      const normalizedData = resumeApiParsed as unknown as StructuredCvData;
      return json({
        success: true,
        filename: safeName,
        mimeType,
        markdown: importedCvToMarkdown(resumeApiParsed),
        data: normalizedData,
        metadata: {
          extraction_method: "resume_parser_api",
          ocr_used: false,
          pages: 1,
        },
        warnings: [],
      });
    }

    const result = await doclingParser.parse(bytes, safeName, mimeType);
    return json({
      success: true,
      filename: result.filename,
      mimeType: result.mimeType,
      markdown: result.markdown,
      metadata: result.metadata,
      warnings: result.warnings ?? [],
    });
  } catch (err: unknown) {
    console.error(`[api/cv/parse] Error parsing ${safeName}:`, err instanceof Error ? `${err.name}: ${err.message}` : err);
    if (err instanceof DocumentParserError) {
      return bad(err.message, err.status);
    }
    return bad("We couldn't read readable content from this CV document. Please try another PDF or DOCX file.", 422);
  }
}
