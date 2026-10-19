import { publicPersona } from "@/server/persona/public";
import { servePersonaPdf } from "@/server/persona/pdf";
import { withBase } from "@/lib/utils";

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
  if (response.status !== 404 || persona.compiled.doc.document.gated) return response;
  if (persona.compiled.doc.document.kind !== "cv") return response;
  const target = withBase(`${persona.base}/cv/?download=1`);
  return Response.redirect(new URL(target, req.url), 303);
}
