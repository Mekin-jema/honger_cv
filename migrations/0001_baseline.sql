-- Baseline: the tables the site had before migrations existed (all IF NOT EXISTS, so an existing
-- database passes unchanged and is simply recorded as migrated).
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor jsonb NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor jsonb NOT NULL,
  rating smallint,
  message text NOT NULL DEFAULT '',
  name text,
  email text
);
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  visitor_id text NOT NULL,
  visitor jsonb NOT NULL,
  intent_id text NOT NULL,
  variant smallint NOT NULL,
  answer_id text NOT NULL DEFAULT '',
  value text NOT NULL CHECK (value IN ('up', 'down')),
  UNIQUE (visitor_id, intent_id, variant, answer_id)
);
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  intent_id text,
  path text,
  consent boolean NOT NULL DEFAULT false,
  visitor jsonb
);
CREATE INDEX IF NOT EXISTS events_at_idx ON events (at);
CREATE TABLE IF NOT EXISTS ai_answers (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor jsonb,
  question text NOT NULL,
  route text NOT NULL,
  intent_id text,
  answer text,
  cards jsonb,
  model text,
  ms integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ai_answers_created_at_idx ON ai_answers (created_at);
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
