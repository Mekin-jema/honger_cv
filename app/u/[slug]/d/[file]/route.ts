import { publicPersona } from "@/server/persona/public";
import { query } from "@/server/db";
import { limited } from "@/server/http";
import { invalidatePersona } from "@/server/persona/cache";
import { renderDocumentPdf, servePersonaPdf, storePersonaPdf } from "@/server/persona/pdf";

export const maxDuration = 300;

export async function GET(req: Request, context: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await context.params;
  const persona = await publicPersona(slug);
  if (!persona) {
    return new Response("Not found", {
      status: 404,
      headers: { "x-robots-tag": "noindex", "cache-control": "no-store" },
    });
  }
  const response = await servePersonaPdf(file, persona.compiled, persona.tier);
  if (
    response.status !== 404 ||
    persona.compiled.doc.legacy ||
    persona.compiled.doc.document.kind !== "cv" ||
    persona.compiled.doc.document.gated ||
    !persona.compiled.versionId
  ) return response;
  if (limited(`public-pdf-generation:${persona.compiled.versionId}`, 3, 60_000)) {
    return new Response("The PDF is being prepared. Please try downloading it again shortly.", {
      status: 429,
      headers: { "retry-after": "60", "cache-control": "no-store" },
    });
  }

  try {
    const generated = await renderDocumentPdf(persona.compiled, new URL(req.url).origin);
    if ("skipped" in generated) {
      return new Response(`PDF generation failed: ${generated.skipped}`, {
        status: 503,
        headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
      });
    }
    const pdfPath = await storePersonaPdf(generated.path, slug, persona.compiled.number);
    await query("UPDATE persona_versions SET pdf_path = $2 WHERE id = $1", [persona.compiled.versionId, pdfPath]);
    invalidatePersona(slug);
    return servePersonaPdf(file, { ...persona.compiled, pdfPath }, persona.tier);
  } catch (error) {
    console.error(`[persona-pdf] Could not create the PDF for ${slug}:`, error instanceof Error ? error.message : error);
    return new Response("PDF generation failed. Please try again later.", {
      status: 503,
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
    });
  }
}
