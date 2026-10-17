-- optional: needs the pgvector extension (Neon and the pgvector Docker image have it). If it is missing
-- the site keeps working, answers use the whole knowledge in the prompt, and this is retried on the next start.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Same text, model and size => same embedding: publishing only embeds what changed.
CREATE TABLE IF NOT EXISTS embedding_cache (
  content_hash text PRIMARY KEY,
  model text NOT NULL,
  dims integer NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per knowledge item (and per ready-made answer) of a published version, per language.
-- Private items are never stored here.
CREATE TABLE IF NOT EXISTS brain_chunks (
  id uuid PRIMARY KEY,
  version_id uuid NOT NULL REFERENCES persona_versions(id) ON DELETE CASCADE,
  slug text NOT NULL,
  item_key text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'unlocked')),
  lang text NOT NULL CHECK (lang IN ('en', 'bn')),
  content text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(768),
  -- 'simple' configuration: no stemming, so Bangla words are kept whole.
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  UNIQUE (version_id, item_key, lang)
);
CREATE INDEX IF NOT EXISTS brain_chunks_version_idx ON brain_chunks (version_id, visibility);
CREATE INDEX IF NOT EXISTS brain_chunks_hnsw_idx ON brain_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS brain_chunks_tsv_idx ON brain_chunks USING gin (tsv);
-- Bangla text search: trigram similarity works where the word parser struggles with Indic marks.
CREATE INDEX IF NOT EXISTS brain_chunks_trgm_idx ON brain_chunks USING gin (content gin_trgm_ops);
