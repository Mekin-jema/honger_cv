import { bad, json, limited, readJson, sameOrigin } from "@/server/http";
import { mapResumeParserResult } from "@/server/brain/resume-parser";
import { adminSession, customerSession } from "@/server/admin-session";
import { hasCvPass } from "@/server/billing";

export const runtime = "nodejs";
export const maxDuration = 120;

function parserConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.RESUME_PARSER_API_URL?.trim();
  const apiKey = process.env.RESUME_PARSER_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new Error("Resume parser is not configured. Set RESUME_PARSER_API_URL and RESUME_PARSER_API_KEY.");
  }

  let parserUrl: URL;
  try {
    parserUrl = new URL(baseUrl);
  } catch {
    throw new Error("RESUME_PARSER_API_URL must be a valid URL.");
  }
  if (parserUrl.protocol !== "https:" && parserUrl.hostname !== "localhost") {
    throw new Error("The Resume Parser API URL must use HTTPS.");
  }
  return { baseUrl, apiKey };
}

function localParseModel(): string | undefined {
  return process.env.NODE_ENV === "production"
    ? undefined
    : `openai_compatible/${process.env.OLLAMA_CV_MODEL?.trim() || "llama3.2"}`;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return bad("Cross-origin requests are not allowed.", 403);
  }

  const [session, admin] = await Promise.all([customerSession(req), adminSession(req)]);
  if (!session && !admin) {
    return bad("Sign in before extracting CV information.", 401);
  }

  if (session && !admin) {
    const passActive = await hasCvPass(session.userId);
    if (!passActive) {
      return json({
        success: false,
        needsPayment: true,
        error: "AI CV extraction requires a CV Design Pass. Please upgrade to import your document.",
      }, 402);
    }
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
    const { baseUrl, apiKey } = parserConfig();
    const parseModels = localParseModel();
    const endpoint = new URL("/api/v1/extract", baseUrl);
    let upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        markdown,
        filename: typeof body?.filename === "string" ? body.filename : "cv.md",
        ...(parseModels ? { parse_models: parseModels } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(110_000)]),
    });

    if (upstream.status === 404) {
      const form = new FormData();
      form.set(
        "file",
        new Blob([markdown], { type: "text/markdown" }),
        typeof body?.filename === "string" ? body.filename : "cv.md",
      );
      form.set("options", JSON.stringify({ ...(parseModels ? { parse_models: parseModels } : {}), ocr: "skip" }));
      upstream = await fetch(new URL("/api/v1/parse", baseUrl), {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: form,
        cache: "no-store",
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(110_000)]),
      });
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      throw new Error(detail || `Resume Parser API returned HTTP ${upstream.status}.`);
    }

    const result = await upstream.json();
    if (!result?.success || !result?.data) {
      throw new Error(result?.error || "The AI extraction service could not process this CV.");
    }

    return json({
      success: true,
      data: mapResumeParserResult(result.data),
      providerUsed: result.metadata?.usage?.[0]?.model ? `parser-api:${result.metadata.usage[0].model}` : "parser-api",
      processingTimeMs: result.metadata?.processing_time_ms ?? 0,
      warnings: [],
    });
  } catch (err: unknown) {
    console.error("[api/cv/extract] Extraction error:", err instanceof Error ? `${err.name}: ${err.message}` : err);
    return bad(
      err instanceof Error ? err.message : "The AI extraction service could not process this CV. Please try again or edit the fields manually.",
      502,
    );
  }
}
