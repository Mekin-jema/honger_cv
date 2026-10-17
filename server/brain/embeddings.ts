import "server-only";
import { createHash } from "node:crypto";
import { embedMany } from "ai";
import { query } from "../db";
import { EMBEDDING_DIMS, embeddingModelId, google } from "./model";

/**
 * Embeddings for knowledge chunks (Gemini embedding model, truncated to 768 dimensions and
 * re-normalised). The same text, model and size always gives the same vector, so publishing only
 * embeds what changed: everything else comes from embedding_cache.
 */

/** pgvector (migration 0003) is optional: without it, answers just use the whole knowledge. */
export async function vectorsAvailable(): Promise<boolean> {
  try {
    const { rows } = await query<{ ok: boolean }>("SELECT to_regclass('brain_chunks') IS NOT NULL AS ok");
    return !!rows[0]?.ok;
  } catch {
    return false;
  }
}

export const cacheKey = (text: string) => createHash("sha256").update(`${embeddingModelId()}|${EMBEDDING_DIMS}|${text}`).digest("hex");

const normalise = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};

/** pgvector's text format: "[0.1,0.2,...]". */
export const toVector = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(7) : "0")).join(",")}]`;

/**
 * Vectors for `texts` (in order), using the cache and embedding only the misses. `onProgress` is told
 * how many are done. Throws when the model can't be reached.
 */
export async function embedTexts(texts: string[], task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY", onProgress?: (done: number, total: number) => Promise<void> | void): Promise<string[]> {
  const keys = texts.map(cacheKey);
  const found = new Map<string, string>();
  if (task === "RETRIEVAL_DOCUMENT" && keys.length) {
    const { rows } = await query<{ content_hash: string; embedding: string }>("SELECT content_hash, embedding::text AS embedding FROM embedding_cache WHERE content_hash = ANY($1)", [keys]);
    for (const r of rows) found.set(r.content_hash, r.embedding);
  }
  const missing = [...new Set(keys.filter((k) => !found.has(k)))];
  const textByKey = new Map(keys.map((k, i) => [k, texts[i]]));
  await onProgress?.(keys.length - missing.length, keys.length);

  const BATCH = 50;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const { embeddings } = await embedMany({
      model: google().embedding(embeddingModelId()),
      values: batch.map((k) => textByKey.get(k)!),
      maxRetries: 2,
      providerOptions: { google: { outputDimensionality: EMBEDDING_DIMS, taskType: task } },
    });
    const vectors = embeddings.map((e) => toVector(normalise(e)));
    batch.forEach((k, j) => found.set(k, vectors[j]));
    if (task === "RETRIEVAL_DOCUMENT")
      await query(
        `INSERT INTO embedding_cache (content_hash, model, dims, embedding)
         SELECT h, $3, $4, v::vector FROM unnest($1::text[], $2::text[]) AS t(h, v) ON CONFLICT (content_hash) DO NOTHING`,
        [batch, vectors, embeddingModelId(), EMBEDDING_DIMS],
      );
    await onProgress?.(keys.length - missing.length + Math.min(i + BATCH, missing.length), keys.length);
  }
  return keys.map((k) => found.get(k)!);
}
