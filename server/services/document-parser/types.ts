import "server-only";

export type SupportedDocumentType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "text/plain"
  | "text/markdown";

export interface DocumentParserMetadata {
  pageCount?: number;
  processingTimeMs: number;
  parserUsed: "docling-api" | "docling-cli" | "native-fallback";
  doclingVersion?: string;
  sourceFormat?: string;
}

export interface ParseDocumentResult {
  success: boolean;
  filename: string;
  mimeType: string;
  markdown: string;
  rawMarkdown?: string;
  metadata: DocumentParserMetadata;
  warnings?: string[];
}

export interface DocumentParser {
  name: string;
  isAvailable(): Promise<boolean> | boolean;
  parse(fileBytes: Uint8Array, filename: string, mimeType?: string): Promise<ParseDocumentResult>;
}

export class DocumentParserError extends Error {
  constructor(message: string, public readonly code: string = "PARSER_ERROR", public readonly status: number = 422) {
    super(message);
    this.name = "DocumentParserError";
  }
}
