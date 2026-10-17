import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { PersonaDocSchema, formatIssues, type PersonaDoc } from "@/lib/persona/schema";
import { runChecks } from "../brain/checks";
import { compileBrain } from "../brain/compile";
import { embedTexts, vectorsAvailable } from "../brain/embeddings";
import { aiEnabled } from "../brain/model";
import { query, withTransaction } from "../db";
import { createJob, runJob, type Job, type JobContext } from "../jobs";
import { invalidatePersona } from "./cache";
import { compilePersona, docHash, type CompiledPersona } from "./compile";
import { renderDocumentPdf } from "./pdf";
import { loadDraft, nextVersionNumber } from "./repo";

/**
 * "Publish & train": turns the current draft into a new live version. Steps (each recorded in
 * admin_jobs, polled by the admin):
 *   validate  the draft against the schema and the other personas (hosts)
 *   compile   the brain: prompt per visitor tier, topics, cards, leak terms, size
 *   snapshot  an immutable persona_versions row (status building)
 *   embed     only the changed knowledge (embedding_cache), into brain_chunks
 *   checks    test questions, leak probes, injection probes (a leak fails the publish)
 *   activate  the new version becomes live; the site picks it up on the next request (no rebuild)
 * A failure leaves the live version untouched. Older versions stay available for one-click rollback.
 */

export class PublishError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
  }
}

const STEPS = [
  { id: "validate", label: "Check the draft" },
  { id: "compile", label: "Build the AI's knowledge" },
  { id: "snapshot", label: "Save a new version" },
  { id: "embed", label: "Index for search" },
  { id: "checks", label: "Test questions and privacy" },
  { id: "activate", label: "Make it live" },
  { id: "pdf", label: "Make the PDF" },
];

/** How many versions keep their search index (rollback stays instant for them). */
const KEEP_INDEXED = 3;

export async function publishedHash(slug: string): Promise<string | null> {
  const { rows } = await query<{ doc_hash: string }>(
    "SELECT v.doc_hash FROM personas p JOIN persona_versions v ON v.id = p.published_version_id WHERE p.slug = $1",
    [slug],
  );
  return rows[0]?.doc_hash ?? null;
}

/** Starts publishing `slug`'s draft in the background. Returns the job (or `unchanged` when the draft equals the live version). */
export async function startPublish(slug: string, opts: { force?: boolean; selfOrigin?: string } = {}): Promise<{ job?: Job; existing?: boolean; unchanged?: boolean }> {
  const draft = await loadDraft(slug);
  if (!draft) throw new PublishError("There is no draft to publish yet.");
  const parsed = PersonaDocSchema.safeParse(draft.doc);
  if (!parsed.success) throw new PublishError("The draft has problems to fix first.", formatIssues(parsed.error, 50));
  const hash = docHash(parsed.data);
  if (!opts.force && (await publishedHash(slug)) === hash) return { unchanged: true };
  const { job, existing } = await createJob("publish", slug, `publish:${slug}:${hash}`, STEPS);
  if (!existing) {
    // Runs after the response is sent (next start keeps the process alive until it finishes).
    after(() => runPublish(job.id, slug, parsed.data, hash, opts.selfOrigin).catch((err) => console.error(`[publish] ${slug}:`, err)));
  }
  return { job, existing };
}

/** The steps of one publish job (also callable directly, e.g. from tests). */
export async function runPublish(jobId: string, slug: string, doc: PersonaDoc, hash: string, selfOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`) {
  let compiled: CompiledPersona = compilePersona(slug, doc);
  let versionId: string | null = null;
  let report: Record<string, unknown> = {};

  const outcome = await runJob(jobId, {
    validate: async () => {
      if (doc.site.hosts.length) {
        const { rows } = await query<{ host: string; slug: string }>("SELECT host, slug FROM persona_hosts WHERE host = ANY($1) AND slug <> $2", [doc.site.hosts, slug]);
        if (rows.length) throw new Error(`The host ${rows[0].host} already shows the "${rows[0].slug}" persona.`);
      }
      return `${doc.questions.length} questions, ${doc.sections.length} sections, ${doc.sections.reduce((n, s) => n + s.items.length, 0)} items`;
    },
    compile: async (ctx) => {
      const brain = compileBrain(compiled);
      report = { ...report, tokens: { public: brain.public.tokens, unlocked: brain.unlocked.tokens }, retrieval: brain.retrieval, chunks: brain.chunks.length };
      if (brain.retrieval) ctx.warn("The knowledge is large: answers will use the most relevant items (retrieval mode) instead of all of it.");
      const empty = doc.sections.filter((s) => s.inChat && !s.items.length).map((s) => s.key);
      if (empty.length) ctx.warn(`Empty sections: ${empty.join(", ")}`);
      const noKeywords = doc.questions.filter((q) => !q.keywords.length && !q.primary).map((q) => q.id);
      if (noKeywords.length) ctx.warn(`Questions nobody can find by typing (no keywords): ${noKeywords.join(", ")}`);
      return `about ${brain.public.tokens.toLocaleString("en")} tokens for public visitors, ${brain.unlocked.tokens.toLocaleString("en")} with an access code`;
    },
    snapshot: async (ctx) => {
      versionId = randomUUID();
      const id = versionId;
      const number = await withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`persona:${slug}`]);
        const n = await nextVersionNumber(client, slug);
        await client.query("INSERT INTO persona_versions (id, slug, number, doc_hash, doc, status) VALUES ($1, $2, $3, $4, $5, 'building')", [id, slug, n, hash, JSON.stringify(doc)]);
        return n;
      });
      ctx.setVersion(id);
      compiled = compilePersona(slug, doc, { versionId: id, number, publishedAt: new Date().toISOString() });
      return `version ${number}`;
    },
    embed: async (ctx) => embedStep(ctx, compiled, versionId!),
    checks: async (ctx) => {
      const r = await runChecks(compiled, { onProgress: (done, total) => ctx.progress(`${done} of ${total} questions`) });
      report = { ...report, checks: r };
      if (r.skipped) {
        ctx.warn(r.skipped);
        return "skipped";
      }
      for (const res of r.results.filter((x) => !x.ok)) ctx.warn(`${res.kind}: "${res.question}" - ${res.note ?? res.route}`);
      if (r.leaks) throw new Error(`${r.leaks} privacy check(s) failed: a hidden detail reached an answer. Nothing was published.`);
      return `${r.results.length - r.warnings} of ${r.results.length} as expected`;
    },
    activate: async () => {
      const id = versionId!;
      await withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`persona:${slug}`]);
        await client.query("UPDATE persona_versions SET status = 'ready', published_at = now(), report = $2 WHERE id = $1", [id, JSON.stringify(report)]);
        await client.query("UPDATE personas SET published_version_id = $2, name = $3, updated_at = now() WHERE slug = $1", [slug, id, doc.name]);
        await client.query("DELETE FROM persona_hosts WHERE slug = $1", [slug]);
        for (const host of doc.site.hosts) await client.query("INSERT INTO persona_hosts (host, slug) VALUES ($1, $2)", [host, slug]);
      });
      invalidatePersona(slug);
      await pruneIndexes(slug).catch((err) => console.error("[publish] Could not prune old search indexes:", err));
      return "live";
    },
    // After going live (the PDF is printed from the live page). Never fails the publish.
    pdf: async (ctx) => {
      try {
        const res = await renderDocumentPdf(compiled, selfOrigin);
        if ("skipped" in res) {
          ctx.warn(res.skipped);
          return "skipped";
        }
        await query("UPDATE persona_versions SET pdf_path = $2 WHERE id = $1", [versionId, res.path]);
        invalidatePersona(slug);
        if (doc.legacy && res.pages > 2) ctx.warn(`The CV PDF is ${res.pages} pages long: shorten it back to 2 (recruiters skim, and the layout is made for 2).`);
        return `${res.pages} ${res.pages === 1 ? "page" : "pages"}, ${Math.round(res.bytes / 1024)} KB`;
      } catch (err) {
        ctx.warn(`The PDF could not be made (${err instanceof Error ? err.message : err}). The document page still works.`);
        return "failed (not blocking)";
      }
    },
  });

  if (!outcome.ok && versionId) await query("UPDATE persona_versions SET status = 'failed', report = $2 WHERE id = $1 AND status = 'building'", [versionId, JSON.stringify(report)]).catch(() => {});
  return outcome;
}

async function embedStep(ctx: JobContext, compiled: CompiledPersona, versionId: string): Promise<string> {
  if (!(await vectorsAvailable())) {
    ctx.warn("The database has no pgvector extension: search indexing was skipped (answers use the whole knowledge).");
    return "skipped (no pgvector)";
  }
  const brain = compileBrain(compiled);
  const chunks = brain.chunks;
  let vectors: (string | null)[] = chunks.map(() => null);
  if (!aiEnabled()) ctx.warn("AI answers are off (no GEMINI_API_KEY): knowledge saved for text search only.");
  else {
    try {
      vectors = await embedTexts(
        chunks.map((c) => c.content),
        "RETRIEVAL_DOCUMENT",
        (done, total) => ctx.progress(`${done} of ${total} embedded`),
      );
    } catch (err) {
      if (brain.retrieval) throw new Error(`Embedding failed and this persona needs search: ${err instanceof Error ? err.message : err}`);
      ctx.warn(`Embedding failed (${err instanceof Error ? err.message : err}); answers use the whole knowledge, so nothing is lost.`);
    }
  }
  // Bulk insert in slices so no statement runs long.
  for (let i = 0; i < chunks.length; i += 200) {
    const slice = chunks.slice(i, i + 200);
    await query(
      `INSERT INTO brain_chunks (id, version_id, slug, item_key, visibility, lang, content, content_hash, embedding)
       SELECT gen_random_uuid(), $1, $2, k, v, l, c, h, e::vector FROM unnest($3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[]) AS t(k, v, l, c, h, e)
       ON CONFLICT (version_id, item_key, lang) DO NOTHING`,
      [versionId, compiled.slug, slice.map((c) => c.itemKey), slice.map((c) => c.visibility), slice.map((c) => c.lang), slice.map((c) => c.content), slice.map((c) => c.hash), vectors.slice(i, i + 200)],
    );
  }
  const embedded = vectors.filter(Boolean).length;
  return `${chunks.length} pieces indexed${embedded ? `, ${embedded} with embeddings` : ""}`;
}

/** Keeps the search index of the newest KEEP_INDEXED ready versions only. */
async function pruneIndexes(slug: string) {
  if (!(await vectorsAvailable())) return;
  await query(
    `DELETE FROM brain_chunks WHERE slug = $1 AND version_id NOT IN (
       SELECT id FROM persona_versions WHERE slug = $1 AND status = 'ready' ORDER BY number DESC LIMIT $2)`,
    [slug, KEEP_INDEXED],
  );
}

/** Rollback (or roll forward): make an earlier ready version live again, instantly. */
export async function activateVersion(slug: string, versionId: string): Promise<boolean> {
  const ok = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`persona:${slug}`]);
    const { rows } = await client.query<{ doc: PersonaDoc }>("SELECT doc FROM persona_versions WHERE id = $1 AND slug = $2 AND status = 'ready'", [versionId, slug]);
    if (!rows[0]) return false;
    await client.query("UPDATE personas SET published_version_id = $2, updated_at = now() WHERE slug = $1", [slug, versionId]);
    await client.query("DELETE FROM persona_hosts WHERE slug = $1", [slug]);
    for (const host of rows[0].doc.site?.hosts ?? []) await client.query("INSERT INTO persona_hosts (host, slug) VALUES ($1, $2)", [host, slug]);
    return true;
  });
  if (ok) invalidatePersona(slug);
  return ok;
}
