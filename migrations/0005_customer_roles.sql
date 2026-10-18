ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer'
  CHECK (role IN ('admin', 'customer'));

-- Before public signup existed, every stored account was created by the one-admin bootstrap script.
UPDATE admin_users SET role = 'admin' WHERE role = 'customer';

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_single_admin_idx
  ON admin_users (role)
  WHERE role = 'admin';

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS owner_user_id text
  REFERENCES admin_users(id) ON DELETE CASCADE;

-- The original job persona remains the public demo. Other pre-existing personas stay under admin
-- control instead of becoming visible to newly registered customers.
UPDATE personas
   SET owner_user_id = (SELECT id FROM admin_users WHERE role = 'admin' ORDER BY "createdAt" LIMIT 1)
 WHERE slug <> 'job'
   AND owner_user_id IS NULL
   AND EXISTS (SELECT 1 FROM admin_users WHERE role = 'admin');

CREATE INDEX IF NOT EXISTS personas_owner_created_idx
  ON personas (owner_user_id, created_at DESC)
  WHERE owner_user_id IS NOT NULL;
