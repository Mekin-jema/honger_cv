import "server-only";
import { DocumentParserError, type DocumentParser, type DocumentParserMetadata, type ParseDocumentResult } from "./types";
import { normalizeMarkdown } from "./markdown-normalizer";
import { parseWithNativeFallback } from "./native-fallback";

export interface DoclingParserOptions {
  apiUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  allowFallback?: boolean;
}

/**
 * Production DocumentParser using Docling.
 * Enforces Docling as the mandatory parsing engine (defaulting to http://localhost:5001 from docker-compose).
 */
export class DoclingParser implements DocumentParser {
  public readonly name = "DoclingParser";
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly allowFallback: boolean;

  constructor(options?: DoclingParserOptions) {
    this.apiUrl = options?.apiUrl ?? (process.env.DOCLING_API_URL?.trim() || "http://localhost:5001");
    this.apiKey = options?.apiKey ?? process.env.DOCLING_API_KEY?.trim() ?? undefined;
    this.timeoutMs = options?.timeoutMs ?? 60_000;
    this.allowFallback = options?.allowFallback ?? process.env.DOCLING_ALLOW_FALLBACK === "true";
  }

  public isAvailable(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Resolves the convert endpoint for Docling Serve.
   */
  private resolveConvertUrl(): string {
    const base = this.apiUrl.replace(/\/+$/, "");
    // The adapter sends multipart files, which Docling Serve accepts at /convert/file.
    if (base.endsWith("/convert/source")) {
      return base.replace(/\/source$/, "/file");
    }
    if (base.endsWith("/convert/file")) {
      return base;
    }
    if (base.endsWith("/convert")) {
      return `${base}/file`;
    }
    return `${base}/v1alpha/convert/file`;
  }

  /**
   * Sends the document to the Docling service.
   */
  private async callDoclingApi(
    fileBytes: Uint8Array,
    filename: string,
    mimeType: string,
  ): Promise<{ rawMarkdown: string; pageCount?: number; doclingVersion?: string }> {
    const url = this.resolveConvertUrl();
    const formData = new FormData();
    const blob = new Blob([fileBytes.slice().buffer as ArrayBuffer], { type: mimeType });
    formData.set("files", blob, filename);
    formData.set("image_export_mode", "placeholder");

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new DocumentParserError(
          `Docling API returned status ${response.status}: ${errorText.slice(0, 300)}`,
          "DOCLING_API_ERROR",
          response.status >= 500 ? 502 : 422,
        );
      }

      const json = await response.json().catch(() => null);
      if (!json || typeof json !== "object") {
        throw new DocumentParserError("Docling API returned invalid response JSON.", "DOCLING_INVALID_RESPONSE", 502);
      }

      // Handle common response formats from Docling / docling-serve:
      // Format 1: { document: { md_content: "..." }, status: "success" }
      // Format 2: { markdown: "...", metadata: { page_count: 2 } }
      // Format 3: { result: { markdown: "..." } }
      const doc = (json as Record<string, unknown>).document as Record<string, unknown> | undefined;
      const rawMarkdown =
        (typeof doc?.markdown === "string" ? doc.markdown : null) ??
        (typeof doc?.md_content === "string" ? doc.md_content : null) ??
        (typeof (json as Record<string, unknown>).markdown === "string" ? ((json as Record<string, unknown>).markdown as string) : null) ??
        (typeof (json as Record<string, unknown>).text === "string" ? ((json as Record<string, unknown>).text as string) : null);

      if (!rawMarkdown) {
        throw new DocumentParserError("Docling converted document but no Markdown output was returned.", "DOCLING_EMPTY_OUTPUT", 422);
      }

      const pageCount =
        typeof doc?.num_pages === "number"
          ? (doc.num_pages as number)
          : typeof (json as Record<string, unknown>).page_count === "number"
          ? ((json as Record<string, unknown>).page_count as number)
          : undefined;

      const doclingVersion =
        typeof (json as Record<string, unknown>).version === "string"
          ? ((json as Record<string, unknown>).version as string)
          : undefined;

      return { rawMarkdown, pageCount, doclingVersion };
    } catch (err: unknown) {
      if (err instanceof DocumentParserError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new DocumentParserError(`Docling request timed out after ${this.timeoutMs}ms.`, "DOCLING_TIMEOUT", 504);
      }
      throw new DocumentParserError(
        `Failed to reach Docling service: ${err instanceof Error ? err.message : String(err)}`,
        "DOCLING_NETWORK_ERROR",
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  public async parse(
    fileBytes: Uint8Array,
    filename: string,
    mimeType: string = "application/pdf",
  ): Promise<ParseDocumentResult> {
    const startTime = Date.now();
    let rawMarkdown = "";
    let pageCount: number | undefined;
    let doclingVersion: string | undefined;
    let parserUsed: DocumentParserMetadata["parserUsed"] = "docling-api";
    const warnings: string[] = [];

    if (this.isAvailable()) {
      try {
        const result = await this.callDoclingApi(fileBytes, filename, mimeType);
        rawMarkdown = result.rawMarkdown;
        pageCount = result.pageCount;
        doclingVersion = result.doclingVersion;
      } catch (doclingErr) {
        if (!this.allowFallback) {
          throw new DocumentParserError(
            `Docling document parsing failed: ${doclingErr instanceof Error ? doclingErr.message : doclingErr}. Please ensure the local-docling container is running on port 5001 ('docker compose up -d docling').`,
            "DOCLING_REQUIRED_ERROR",
            502,
          );
        }
        console.warn(
          `[DoclingParser] Docling API call failed (${doclingErr instanceof Error ? doclingErr.message : doclingErr}); using native fallback.`,
        );
        warnings.push("Docling API was temporarily unreachable; processed using document converter fallback.");
        const fallback = await parseWithNativeFallback(fileBytes, filename, mimeType);
        rawMarkdown = fallback.rawMarkdown ?? fallback.markdown;
        pageCount = fallback.metadata.pageCount;
        parserUsed = "native-fallback";
      }
    } else {
      // DOCLING_API_URL not configured: process with native fallback
      const fallback = await parseWithNativeFallback(fileBytes, filename, mimeType);
      rawMarkdown = fallback.rawMarkdown ?? fallback.markdown;
      pageCount = fallback.metadata.pageCount;
      parserUsed = "native-fallback";
    }

    if (!rawMarkdown || !rawMarkdown.trim()) {
      throw new DocumentParserError(
        "No readable content could be extracted from this document. Please ensure it contains selectable text.",
        "EMPTY_DOCUMENT",
        422,
      );
    }

    // Pass through markdown normalizer
    const normalizedMarkdown = normalizeMarkdown(rawMarkdown);

    const processingTimeMs = Date.now() - startTime;
    return {
      success: true,
      filename,
      mimeType,
      markdown: normalizedMarkdown,
      rawMarkdown,
      metadata: {
        pageCount,
        processingTimeMs,
        parserUsed,
        doclingVersion,
        sourceFormat: filename.split(".").pop(),
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

// Default singleton instance
export const doclingParser = new DoclingParser();
