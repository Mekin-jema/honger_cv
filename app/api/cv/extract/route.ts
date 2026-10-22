import { bad, json, limited, readJson, sameOrigin } from "@/server/http";
import { cvExtractor } from "@/server/services/cv-extractor";
import { CvExtractorError } from "@/server/services/cv-extractor/cv-extractor";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return bad("Cross-origin requests are not allowed.", 403);
  }

  if (limited("cv:extract", 20, 10 * 60_000)) {
    return bad("Too many extraction requests. Please wait a moment before trying again.", 429);
  }

  const body = await readJson(req, 1_000_000);
  const markdown = typeof body?.markdown === "string" ? body.markdown.trim() : "";

  if (!markdown || markdown.length < 10) {
    return bad("Please provide valid document Markdown to extract CV information.", 400);
  }

  try {
    const result = await cvExtractor.extract(markdown);
    return json({
      success: true,
      data: result.data,
      providerUsed: result.providerUsed,
      processingTimeMs: result.processingTimeMs,
      warnings: result.warnings ?? [],
    });
  } catch (err: unknown) {
    console.error("[api/cv/extract] Extraction error:", err instanceof Error ? `${err.name}: ${err.message}` : err);
    if (err instanceof CvExtractorError) {
      return bad(err.message, err.status);
    }
    return bad("The AI extraction service could not process this CV. Please try again or edit the fields manually.", 502);
  }
}
