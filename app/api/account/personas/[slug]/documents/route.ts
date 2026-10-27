import { bad, forbidden, json, limited, sameOrigin } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { loadDraft, personaOwnedBy, saveDraft } from "@/server/persona/repo";
import { PersonaDocShape } from "@/lib/persona/schema";
import { doclingParser } from "@/server/services/document-parser";
import { parseWithNativeFallback } from "@/server/services/document-parser/native-fallback";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 15_000_000; // 15 MB
const SLUG = /^[a-z][a-z0-9-]{1,31}$/;

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
};

function sanitizeFilename(raw: string): string {
  const base = raw.replace(/^.*[/\\]/, "").trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 100) || "document.txt";
}

function chunkDocumentText(text: string, maxChunkLength = 700): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= maxChunkLength) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > maxChunkLength) {
        // Break long paragraph on sentence boundaries
        const sentences = para.split(/(?<=[.!?])\s+/);
        let sub = "";
        for (const sent of sentences) {
          if ((sub + " " + sent).length <= maxChunkLength) {
            sub = sub ? `${sub} ${sent}` : sent;
          } else {
            if (sub) chunks.push(sub);
            sub = sent.slice(0, maxChunkLength);
          }
        }
        if (sub) chunks.push(sub);
        current = "";
      } else {
        current = para;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.length >= 20);
}

interface ParsedDocSummary {
  id: string;
  name: string;
  chunkCount: number;
  wordCount: number;
  preview: string;
}

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await customerSession(req);
  if (!session) return bad("Sign in to manage documents.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);

  const draft = await loadDraft(slug);
  if (!draft) return bad("Profile has no draft.", 404);

  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) return bad("Profile draft format is invalid.", 422);

  const section = parsed.data.sections.find((s) => s.key === "knowledge");
  if (!section || !section.items.length) {
    return json({ ok: true, documents: [] });
  }

  // Group items by document name
  const grouped = new Map<string, { id: string; name: string; chunks: string[]; wordCount: number }>();

  for (const it of section.items) {
    const docName = (typeof it.label === "string" ? it.label : it.label?.en) || (typeof it.meta === "string" ? it.meta : it.meta?.en) || "Document";
    const textContent = typeof it.text === "string" ? it.text : it.text?.en || "";
    const docKey = docName.toLowerCase();

    const existing = grouped.get(docKey);
    const words = textContent.split(/\s+/).filter(Boolean).length;
    if (existing) {
      existing.chunks.push(textContent);
      existing.wordCount += words;
    } else {
      grouped.set(docKey, {
        id: it.id.split("-")[0] || it.id,
        name: docName,
        chunks: [textContent],
        wordCount: words,
      });
    }
  }

  const documents: ParsedDocSummary[] = Array.from(grouped.values()).map((doc) => ({
    id: doc.id,
    name: doc.name,
    chunkCount: doc.chunks.length,
    wordCount: doc.wordCount,
    preview: doc.chunks[0]?.slice(0, 160) || "",
  }));

  return json({ ok: true, documents });
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to upload documents.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);

  if (limited(`doc-upload:${session.userId}:${slug}`, 40, 10 * 60_000)) {
    return bad("Too many document uploads. Please wait a few minutes.", 429);
  }

  let filename = "notes.txt";
  let markdownText = "";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return bad("No file uploaded. Select a document first.");
    }

    if (file.size > MAX_FILE_BYTES) {
      return bad("File exceeds the maximum size limit of 15 MB.", 413);
    }

    filename = sanitizeFilename(file.name);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_MAP[ext] || file.type || "application/octet-stream";

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    try {
      if (ext === "txt" || ext === "md" || ext === "markdown") {
        markdownText = new TextDecoder().decode(bytes);
      } else {
        const parseResult = await doclingParser.parse(bytes, filename, mime).catch(async () => {
          return parseWithNativeFallback(bytes, filename, mime);
        });
        markdownText = parseResult.markdown;
      }
    } catch (parseError) {
      return bad(
        `Failed to parse ${filename}: ${parseError instanceof Error ? parseError.message : "Unreadable format"}`,
        422,
      );
    }
  } else {
    // JSON direct text input
    const body = (await req.json().catch(() => null)) as { text?: string; title?: string } | null;
    if (!body || !body.text || body.text.trim().length < 20) {
      return bad("Provide at least 20 characters of document text.", 400);
    }
    filename = sanitizeFilename(body.title || "Pasted_Notes.txt");
    markdownText = body.text.trim();
  }

  const chunks = chunkDocumentText(markdownText, 700);
  if (!chunks.length) {
    return bad("The document had no readable text content.", 422);
  }

  const draft = await loadDraft(slug);
  if (!draft) return bad("Profile has no editable draft.", 404);

  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) return bad("Profile draft format is invalid.", 422);

  const nextDoc = structuredClone(parsed.data);

  // Find or create the "knowledge" section
  let knowledgeSection = nextDoc.sections.find((s) => s.key === "knowledge");
  if (!knowledgeSection) {
    knowledgeSection = {
      key: "knowledge",
      title: "Knowledge & Documents",
      display: "paragraphs",
      visibility: "public",
      inChat: true,
      inDocument: false,
      inSite: false,
      items: [],
    };
    nextDoc.sections.push(knowledgeSection);
  }

  // Remove existing items with same document name if replacing
  knowledgeSection.items = knowledgeSection.items.filter((it) => {
    const label = typeof it.label === "string" ? it.label : it.label?.en;
    return label?.toLowerCase() !== filename.toLowerCase();
  });

  // Unique document prefix
  const docPrefix = `doc${Date.now().toString(36)}`;
  const newItems = chunks.map((chunk, index) => ({
    id: `${docPrefix}-${index + 1}`,
    label: filename,
    meta: filename,
    text: chunk,
    tags: [filename.replace(/\.[^.]+$/, "")],
  }));

  knowledgeSection.items.push(...newItems);

  // Save draft
  const newRev = await saveDraft(slug, nextDoc, draft.rev);
  if (!newRev) {
    return bad("Draft conflict. Reload before adding documents.", 409);
  }

  const wordCount = chunks.reduce((acc, c) => acc + c.split(/\s+/).filter(Boolean).length, 0);

  return json({
    ok: true,
    document: {
      id: docPrefix,
      name: filename,
      chunkCount: chunks.length,
      wordCount,
      preview: chunks[0].slice(0, 160),
    },
    rev: newRev,
  });
}

export async function DELETE(req: Request, context: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to delete documents.", 401);
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return bad("Profile not found.", 404);

  const body = (await req.json().catch(() => null)) as { documentName?: string; documentId?: string } | null;
  const targetName = body?.documentName?.toLowerCase().trim();
  const targetId = body?.documentId?.toLowerCase().trim();

  if (!targetName && !targetId) {
    return bad("Document name or ID is required.", 400);
  }

  const draft = await loadDraft(slug);
  if (!draft) return bad("Profile has no draft.", 404);

  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) return bad("Profile draft format is invalid.", 422);

  const nextDoc = structuredClone(parsed.data);
  const section = nextDoc.sections.find((s) => s.key === "knowledge");

  if (section) {
    section.items = section.items.filter((it) => {
      const label = (typeof it.label === "string" ? it.label : it.label?.en)?.toLowerCase();
      const meta = (typeof it.meta === "string" ? it.meta : it.meta?.en)?.toLowerCase();
      const itemId = it.id.toLowerCase();

      if (targetName && (label === targetName || meta === targetName)) return false;
      if (targetId && itemId.startsWith(targetId)) return false;
      return true;
    });
  }

  const newRev = await saveDraft(slug, nextDoc, draft.rev);
  if (!newRev) return bad("Draft conflict. Reload before deleting.", 409);

  return json({ ok: true, rev: newRev });
}
