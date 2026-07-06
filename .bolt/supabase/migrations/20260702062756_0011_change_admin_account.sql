-- Change administrator account
-- New admin: rahatislam6028@gmail.com
-- Previous admins demoted to user: admin@noorlibrary.bd, vitalbodyfit000@gmail.com

-- Set rahatislam6028@gmail.com as admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'b24b2929-b93f-4fc9-a1ea-d5b754fefe0f';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = 'b24b2929-b93f-4fc9-a1ea-d5b754fefe0f';

-- Remove admin from admin@noorlibrary.bd
UPDATE public.profiles
SET role = 'user'
WHERE id = '85148019-d2a3-4637-ae2b-b4a028075296';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role' || '{"role": "user"}'::jsonb
WHERE id = '85148019-d2a3-4637-ae2b-b4a028075296';

-- Remove admin from vitalbodyfit000@gmail.com
UPDATE public.profiles
SET role = 'user'
WHERE id = '57dc6775-9cd1-4cd9-9bd9-f0204291d39f';

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role' || '{"role": "user"}'::jsonb
WHERE id = '57dc6775-9cd1-4cd9-9bd9-f0204291d39f';
