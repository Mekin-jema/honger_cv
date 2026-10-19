import { servePersonaPdf } from "@/server/persona/pdf";
import { personaForRequest } from "@/server/persona/resolve";

/**
 * The persona's document PDF (/d/<file name>), for visitors allowed to see the document: everyone when
 * it isn't gated, else only visitors with an access code. Never indexed. 404 for anything else, so a
 * locked document doesn't even confirm it exists.
 * The job persona's CV (also reachable at its old address, see next.config.ts) is the PDF printed at the
 * last publish, or the one shipped in public/ before the first.
 */
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const p = await personaForRequest(req);
  return servePersonaPdf(file, p.compiled, p.tier);
}
