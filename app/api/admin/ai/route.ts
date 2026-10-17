import { PersonaDocShape } from "@/lib/persona/schema";
import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { draftAnswer, missingBangla, structureText, suggestQuestions, translateToBangla } from "@/server/brain/assist";
import { aiEnabled } from "@/server/brain/model";
import { bad, json, limited, readJson, str } from "@/server/http";
import { personaRow } from "@/server/persona/studio";

export const maxDuration = 120;

/**
 * POST { action, slug, doc, ... }: the Studio's AI helpers, run on the editor's current document (it may
 * be unsaved or unfinished). Results go back to the editor for review; nothing is saved here.
 *   structure        { text }                -> { markdown }   free text in the template format
 *   suggest          {}                      -> { markdown }   new questions with drafted answers
 *   draft-answer     { label, prompt }       -> { answer: { en, bn? } }
 *   translate        {}                      -> { items: [{ path, bn }], total }   missing Bangla
 */
export async function POST(req: Request) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  if (!aiEnabled()) return bad("AI helpers need GEMINI_API_KEY.", 503);
  if (limited("admin:ai", 40, 10 * 60_000)) return bad("Too many AI requests at once - try again in a few minutes.", 429);
  const body = await readJson(req, 2_500_000);
  const slug = str(body?.slug, 32);
  if (!body || !slug || !SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const parsed = PersonaDocShape.safeParse(body.doc);
  if (!parsed.success) return bad("The document is not in a shape the helpers can read. Fix the problems in the JSON tab first.", 422);
  const doc = parsed.data;
  try {
    switch (body.action) {
      case "structure": {
        const text = str(body.text, 20_000);
        if (!text || text.length < 10) return bad("Paste some text first.");
        return json({ ok: true, markdown: await structureText(doc, text) });
      }
      case "suggest":
        return json({ ok: true, markdown: await suggestQuestions(doc) });
      case "draft-answer": {
        const label = str(body.label, 200);
        const prompt = str(body.prompt, 400) ?? label;
        if (!label || !prompt) return bad("The question needs a label first.");
        return json({ ok: true, answer: await draftAnswer(doc, { label, prompt }) });
      }
      case "translate": {
        if (!doc.site.languages.includes("bn")) return bad("Add Bangla to the site's languages first (Identity & site).");
        const missing = missingBangla(doc);
        if (!missing.length) return json({ ok: true, items: [], total: 0 });
        return json({ ok: true, items: await translateToBangla(doc, missing), total: missing.length });
      }
      default:
        return bad("Unknown action.");
    }
  } catch (err) {
    console.error(`[admin-ai] ${String(body.action)}:`, err instanceof Error ? `${err.name}: ${err.message}` : err);
    return bad("The AI couldn't do that right now. Try again in a moment.", 502);
  }
}
