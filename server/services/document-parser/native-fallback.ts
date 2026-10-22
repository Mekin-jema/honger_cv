import "server-only";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createInflateRaw } from "node:zlib";
import { DocumentParserError, type DocumentParserMetadata, type ParseDocumentResult } from "./types";

/**
 * Extracts plain text from a DOCX file without external dependencies by reading word/document.xml
 * from the zip container using Node's stream/zlib.
 */
async function extractDocxText(bytes: Uint8Array): Promise<{ text: string; pageCount?: number }> {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Search for the ZIP local file header for "word/document.xml"
  const entryName = "word/document.xml";
  const nameBuffer = Buffer.from(entryName, "utf8");
  const index = buffer.indexOf(nameBuffer);

  if (index === -1) {
    throw new DocumentParserError("Invalid DOCX format: could not locate word/document.xml", "INVALID_DOCX");
  }

  // Local file header layout in zip:
  // 0..3: signature 0x04034b50
  // 8..9: compression method (0 = stored, 8 = deflated)
  // 18..21: compressed size
  // 26..27: filename length (n)
  // 28..29: extra field length (m)
  // 30: filename (n bytes)
  // 30 + n: extra field (m bytes)
  // 30 + n + m: compressed data
  const headerStart = index - 30;
  if (headerStart < 0 || buffer.readUInt32LE(headerStart) !== 0x04034b50) {
    throw new DocumentParserError("Corrupted DOCX header structure", "CORRUPTED_DOCX");
  }

  const compressionMethod = buffer.readUInt16LE(headerStart + 8);
  const compressedSize = buffer.readUInt32LE(headerStart + 18);
  const nameLen = buffer.readUInt16LE(headerStart + 26);
  const extraLen = buffer.readUInt16LE(headerStart + 28);
  const dataStart = headerStart + 30 + nameLen + extraLen;

  let xmlString = "";
  if (compressionMethod === 0) {
    // Uncompressed
    xmlString = buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
  } else if (compressionMethod === 8) {
    // Deflate
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
    xmlString = await new Promise<string>((resolve, reject) => {
      const inflate = createInflateRaw();
      const chunks: Buffer[] = [];
      inflate.on("data", (chunk) => chunks.push(chunk));
      inflate.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      inflate.on("error", reject);
      inflate.end(compressedData);
    });
  } else {
    throw new DocumentParserError(`Unsupported DOCX compression method: ${compressionMethod}`, "UNSUPPORTED_COMPRESSION");
  }

  // Convert Word XML to clean structured Markdown
  // Replace <w:p> with newlines, detect heading styles, extract <w:t> text
  const paragraphs: string[] = [];
  const pRegex = /<w:p(?:\s[^>]*)?>(.*?)<\/w:p>/g;
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(xmlString)) !== null) {
    const pXml = match[1];
    // Check if it's a heading
    const isHeading1 = /<w:pStyle\s+w:val=["']Heading1["']/i.test(pXml);
    const isHeading2 = /<w:pStyle\s+w:val=["']Heading2["']/i.test(pXml);
    const isHeading3 = /<w:pStyle\s+w:val=["']Heading3["']/i.test(pXml);

    // Extract all text inside <w:t>
    const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let pText = "";
    while ((tMatch = tRegex.exec(pXml)) !== null) {
      pText += tMatch[1];
    }

    const trimmed = pText.trim();
    if (!trimmed) continue;

    if (isHeading1) {
      paragraphs.push(`# ${trimmed}`);
    } else if (isHeading2) {
      paragraphs.push(`## ${trimmed}`);
    } else if (isHeading3) {
      paragraphs.push(`### ${trimmed}`);
    } else {
      paragraphs.push(trimmed);
    }
  }

  return { text: paragraphs.join("\n\n") };
}

/**
 * Extracts structured Markdown from PDF using pdfjs-dist.
 */
async function extractPdfText(data: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const task = getDocument({ data, isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) {
      throw new DocumentParserError("This PDF exceeds the maximum supported 100 pages.", "TOO_MANY_PAGES", 413);
    }
    const pageOutputs: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") {
          const str = item.str;
          const y = "transform" in item && Array.isArray(item.transform) ? item.transform[5] : null;

          // When Y position changes significantly, start a new line
          if (lastY !== null && y !== null && Math.abs(lastY - y) > 4) {
            if (currentLine.trim()) lines.push(currentLine.trim());
            currentLine = str;
          } else {
            currentLine += (currentLine ? " " : "") + str;
          }
          lastY = y;
        }
      }
      if (currentLine.trim()) lines.push(currentLine.trim());

      pageOutputs.push(lines.join("\n"));
    }

    return { text: pageOutputs.join("\n\n"), pageCount: pdf.numPages };
  } finally {
    await task.destroy();
  }
}

/**
 * Fallback parser for environments where the Docling service is not yet deployed or is unreachable.
 */
export async function parseWithNativeFallback(
  fileBytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<ParseDocumentResult> {
  const start = Date.now();
  let markdown = "";
  let pageCount: number | undefined;

  const lowerName = filename.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const res = await extractPdfText(fileBytes);
    markdown = res.text;
    pageCount = res.pageCount;
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const res = await extractDocxText(fileBytes);
    markdown = res.text;
  } else if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md")
  ) {
    markdown = new TextDecoder("utf-8").decode(fileBytes);
  } else {
    throw new DocumentParserError(`Unsupported document format for ${filename}`, "UNSUPPORTED_FORMAT", 415);
  }

  const processingTimeMs = Date.now() - start;
  const metadata: DocumentParserMetadata = {
    pageCount,
    processingTimeMs,
    parserUsed: "native-fallback",
    sourceFormat: lowerName.split(".").pop(),
  };

  return {
    success: true,
    filename,
    mimeType,
    markdown,
    rawMarkdown: markdown,
    metadata,
  };
}
