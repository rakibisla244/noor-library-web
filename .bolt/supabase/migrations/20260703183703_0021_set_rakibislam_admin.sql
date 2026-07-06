/*
# Set rakibislam6028@gmail.com as primary admin

## Overview
Promotes the auth account with email `rakibislam6028@gmail.com` to admin
(both profiles.role and auth.users raw_app_meta_data). Demotes any other
admin accounts back to user so this is the single primary admin.

## Notes
- Idempotent: re-running is safe. If the account does not exist yet, no
  rows are changed (the account must be registered first via the sign-up
  page; once it exists, re-running this migration promotes it).
- The previous admin (rahatislam6028@gmail.com) is demoted to user.
- All admin notifications are routed to rakibislam6028@gmail.com via the
  ADMIN_NOTIFY_EMAIL setting (set in the prior migration).
*/

-- Promote rakibislam6028@gmail.com (if the account exists)
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'rakibislam6028@gmail.com'
);

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'rakibislam6028@gmail.com';

-- Demote every other admin back to user (so rakibislam is the sole admin)
UPDATE public.profiles
SET role = 'user'
WHERE role = 'admin'
  AND id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rakibislam6028@gmail.com'
  );

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role' || '{"role":"user"}'::jsonb
WHERE email <> 'rakibislam6028@gmail.com'
  AND COALESCE((raw_app_meta_data->>'role'), 'user') = 'admin';
