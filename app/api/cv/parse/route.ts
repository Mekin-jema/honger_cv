import { bad, json, limited, sameOrigin } from "@/server/http";
import { doclingParser } from "@/server/services/document-parser";
import { DocumentParserError } from "@/server/services/document-parser/types";

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
  if (!(file instanceof File) || !file.size) {
    return bad("Choose a CV document (PDF, DOCX, TXT, or Markdown) to upload.", 400);
  }

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
