-- Fix: auth.instances table was empty, causing "Database error finding user"
-- during signUp. GoTrue requires at least one row in auth.instances to
-- resolve the instance_id when looking up or creating users.
-- Existing users already have instance_id = '00000000-0000-0000-0000-000000000000'
-- but the corresponding row in auth.instances was missing.

INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  '',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
