import { publicPersona } from "@/server/persona/public";
import { servePersonaPdf } from "@/server/persona/pdf";

export async function GET(_req: Request, context: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await context.params;
  const persona = await publicPersona(slug);
  if (!persona) {
    return new Response("Not found", {
      status: 404,
      headers: { "x-robots-tag": "noindex", "cache-control": "no-store" },
    });
  }
  return servePersonaPdf(file, persona.compiled, persona.tier);
}
