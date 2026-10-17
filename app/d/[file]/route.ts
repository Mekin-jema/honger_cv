import { readFile } from "node:fs/promises";
import path from "node:path";
import { documentOpen } from "@/server/persona/compile";
import { docsDir } from "@/server/persona/pdf";
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
  const { doc, pdfPath } = p.compiled;
  const missing = () => new Response("Not found", { status: 404, headers: { "x-robots-tag": "noindex", "cache-control": "no-store" } });
  if (file !== doc.document.fileName || !documentOpen(doc, p.tier)) return missing();

  let full: string;
  if (pdfPath) {
    const root = docsDir();
    full = path.resolve(root, pdfPath);
    if (!full.startsWith(root + path.sep)) return missing();
  } else if (doc.legacy) {
    full = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", doc.document.fileName);
  } else return missing();

  let body: Buffer;
  try {
    body = await readFile(full);
  } catch {
    if (!doc.legacy || !pdfPath) return missing();
    // A printed CV that went missing (new server, wiped disk): the shipped one still works.
    try {
      body = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", doc.document.fileName));
    } catch {
      return missing();
    }
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/pdf",
      // The CV opens in the browser as it always did; gated documents download.
      "content-disposition": `${doc.legacy ? "inline" : "attachment"}; filename="${doc.document.fileName}"`,
      // The CV stays indexable as before; other personas' documents are for their visitors only.
      ...(doc.legacy ? {} : { "x-robots-tag": "noindex" }),
      // A gated PDF is per visitor; an open one can be cached briefly (a publish prints a new one).
      "cache-control": doc.document.gated ? "private, no-store" : "public, max-age=3600",
    },
  });
}
