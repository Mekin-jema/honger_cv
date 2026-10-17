import { PersonaDocSchema, formatIssues } from "@/lib/persona/schema";
import { SLUG_RE, adminGuard, isResponse } from "@/server/admin-api";
import { compileBrain } from "@/server/brain/compile";
import { bad, json, readJson } from "@/server/http";
import { compilePersona } from "@/server/persona/compile";
import { personaRow } from "@/server/persona/studio";

type Ctx = { params: Promise<{ slug: string }> };

/** POST { doc, tier }: what the AI would be told for this draft, per visitor level ("What the AI sees"). */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug) || !(await personaRow(slug))) return bad("No such persona.", 404);
  const body = await readJson(req, 2_500_000);
  const parsed = PersonaDocSchema.safeParse(body?.doc);
  if (!parsed.success) return json({ ok: false, error: "Fix the draft's problems first.", issues: formatIssues(parsed.error, 20) }, 422);
  const brain = compileBrain(compilePersona(slug, parsed.data));
  const tier = body?.tier === "unlocked" ? brain.unlocked : brain.public;
  return json({ ok: true, prompt: tier.prompt, tokens: tier.tokens, retrieval: brain.retrieval, gated: tier.gatedTitles, leakTerms: tier.leakTerms.length });
}
