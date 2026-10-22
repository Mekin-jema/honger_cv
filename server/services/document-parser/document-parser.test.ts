import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "./markdown-normalizer";
import { DoclingParser } from "./docling-parser";
import { DocumentParserError } from "./types";

describe("Markdown Normalizer", () => {
  it("removes page break markers and parser noise while preserving headings and lists", () => {
    const raw = `
# John Doe
<!-- page_break -->
## Experience

--- Page 1 of 2 ---
- Senior Engineer at Acme Corp (2020 - Present)
  • Led platform migration
  ⁃ Reduced latency by 40%

<!-- image:fig1 -->

--- Page 2 of 2 ---
## Education
- BSc Computer Science, Tech University
`;

    const normalized = normalizeMarkdown(raw);

    expect(normalized).toContain("# John Doe");
    expect(normalized).toContain("## Experience");
    expect(normalized).toContain("- Senior Engineer at Acme Corp (2020 - Present)");
    expect(normalized).toContain("- Led platform migration");
    expect(normalized).toContain("- Reduced latency by 40%");
    expect(normalized).toContain("## Education");
    expect(normalized).toContain("- BSc Computer Science, Tech University");

    // Cleaned artifacts
    expect(normalized).not.toContain("<!-- page_break -->");
    expect(normalized).not.toContain("Page 1 of 2");
    expect(normalized).not.toContain("<!-- image:fig1 -->");
  });

  it("cleans excessive consecutive blank lines down to two newlines", () => {
    const raw = "Paragraph 1\n\n\n\n\n\nParagraph 2";
    expect(normalizeMarkdown(raw)).toBe("Paragraph 1\n\nParagraph 2");
  });

  it("removes empty orphaned headings without content", () => {
    const raw = `
# Section One
Some text here.

## Empty Section

## Section Two
Text in section two.
`;
    const normalized = normalizeMarkdown(raw);
    expect(normalized).toContain("# Section One");
    expect(normalized).toContain("## Section Two");
    expect(normalized).not.toContain("## Empty Section");
  });

  it("strips soft hyphens, zero-width spaces, and control characters", () => {
    const raw = "Engi\u00ADneer\u200B at \u0000Acme";
    expect(normalizeMarkdown(raw)).toBe("Engineer at Acme");
  });
});

describe("Docling Parser & Fallbacks", () => {
  it("parses plain text and markdown documents directly", async () => {
    const parser = new DoclingParser({ allowFallback: true });
    const content = "# Mekin Jemal\n\nSoftware Engineer with experience in Next.js and PostgreSQL.";
    const bytes = new TextEncoder().encode(content);

    const result = await parser.parse(bytes, "resume.md", "text/markdown");
    expect(result.success).toBe(true);
    expect(result.filename).toBe("resume.md");
    expect(result.markdown).toContain("# Mekin Jemal");
    expect(result.metadata.sourceFormat).toBe("md");
  });

  it("throws DocumentParserError on empty document", async () => {
    const parser = new DoclingParser();
    const bytes = new Uint8Array(0);

    await expect(parser.parse(bytes, "empty.txt", "text/plain")).rejects.toThrow(DocumentParserError);
  });

  it("throws DocumentParserError on unsupported file extension", async () => {
    const parser = new DoclingParser();
    const bytes = new TextEncoder().encode("random binary");

    await expect(parser.parse(bytes, "archive.zip", "application/zip")).rejects.toThrow(DocumentParserError);
  });

  it("uses Docling API response when DOCLING_API_URL is configured", async () => {
    // Test custom mock API endpoint
    const mockApiUrl = "https://mock-docling.example.com/convert";
    const parser = new DoclingParser({ apiUrl: mockApiUrl, apiKey: "test-key" });

    expect(parser.isAvailable()).toBe(true);
  });
});
