CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  persona_slug text REFERENCES personas(slug) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'profile_created',
    'draft_saved',
    'assistant_tested',
    'publish_started',
    'profile_published',
    'template_saved',
    'pdf_print_requested'
  )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_created_at_idx
  ON platform_events (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_user_created_idx
  ON platform_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_type_created_idx
  ON platform_events (event_type, created_at DESC);
