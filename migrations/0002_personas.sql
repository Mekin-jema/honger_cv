-- Personas: one site, several "faces" (job, marriage, ...). A persona is edited as a draft and goes
-- live as an immutable version; the site serves personas.published_version_id. Existing rows in the
-- visitor tables belong to the job persona (DEFAULT 'job').

CREATE TABLE IF NOT EXISTS personas (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z][a-z0-9-]{1,31}$'),
  name text NOT NULL DEFAULT '',
  published_version_id uuid,
  -- Bumping it ends every visitor unlock of this persona at once ("log everyone out").
  access_epoch integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Host names that show a persona when PERSONA_ROUTING=host (filled from the persona's site settings).
CREATE TABLE IF NOT EXISTS persona_hosts (
  host text PRIMARY KEY,
  slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS persona_drafts (
  slug text PRIMARY KEY REFERENCES personas(slug) ON DELETE CASCADE,
  doc jsonb NOT NULL,
  -- Optimistic concurrency: a save must name the revision it started from.
  rev integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS persona_versions (
  id uuid PRIMARY KEY,
  slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE,
  number integer NOT NULL,
  doc_hash text NOT NULL,
  -- The full document, private items included: read by the server and the admin only.
  doc jsonb NOT NULL,
  -- What publishing found: token counts, warnings, check results.
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'ready', 'failed')),
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (slug, number)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personas_published_fk') THEN
    ALTER TABLE personas ADD CONSTRAINT personas_published_fk
      FOREIGN KEY (published_version_id) REFERENCES persona_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Background work started from the admin: publish & train, PDF, checks, imports.
CREATE TABLE IF NOT EXISTS admin_jobs (
  id uuid PRIMARY KEY,
  kind text NOT NULL DEFAULT 'publish' CHECK (kind IN ('publish', 'pdf', 'checks', 'import')),
  slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE,
  version_id uuid REFERENCES persona_versions(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  step text,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  heartbeat_at timestamptz
);
-- One live job per key: a double click returns the running job instead of starting a second one.
CREATE UNIQUE INDEX IF NOT EXISTS admin_jobs_live_idx ON admin_jobs (idempotency_key) WHERE status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS admin_jobs_slug_idx ON admin_jobs (slug, created_at DESC);

-- Access codes for "unlocked" details. Codes are server-generated (100 random bits), stored hashed.
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY,
  slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_codes_slug_idx ON access_codes (slug);

-- Who unlocked when (audit only; visitors' unlock state lives in a signed cookie).
CREATE TABLE IF NOT EXISTS access_grants (
  id uuid PRIMARY KEY,
  slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE,
  code_id uuid REFERENCES access_codes(id) ON DELETE SET NULL,
  visitor_id text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- The visitor tables learn which persona each row came from.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'job',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'contact' CHECK (kind IN ('contact', 'access')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'declined')),
  ADD COLUMN IF NOT EXISTS code_id uuid REFERENCES access_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS relation text;
ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'job';

ALTER TABLE events ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'job';
CREATE INDEX IF NOT EXISTS events_persona_at_idx ON events (persona, at);

-- Question ids are per persona now, so a vote's key includes the persona. The old constraint was
-- auto-named by Postgres; find it instead of guessing its name.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'job';
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'votes'::regclass AND contype = 'u' AND conname <> 'votes_persona_key'
  LOOP
    EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', c);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_persona_key') THEN
    ALTER TABLE votes ADD CONSTRAINT votes_persona_key UNIQUE (persona, visitor_id, intent_id, variant, answer_id);
  END IF;
END $$;

ALTER TABLE ai_answers
  ADD COLUMN IF NOT EXISTS persona text NOT NULL DEFAULT 'job',
  ADD COLUMN IF NOT EXISTS version_id uuid,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS lang text,
  -- off-topic | missing-fact | unsafe (why the AI declined)
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS confidence text,
  -- item keys the answer used (retrieval mode)
  ADD COLUMN IF NOT EXISTS retrieved jsonb,
  -- {leak, hedged, injection, gatedSection}
  ADD COLUMN IF NOT EXISTS flags jsonb,
  -- {input, output, cached} token counts
  ADD COLUMN IF NOT EXISTS usage jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  -- "fact:<section>/<item>" or "question:<id>" when the owner turned it into content
  ADD COLUMN IF NOT EXISTS promoted_to text;
CREATE INDEX IF NOT EXISTS ai_answers_review_idx ON ai_answers (persona, created_at DESC) WHERE reviewed_at IS NULL;

INSERT INTO personas (slug, name) VALUES ('job', 'Job') ON CONFLICT (slug) DO NOTHING;
