/*
# Promote rakibislam6028@gmail.com to admin (account now exists)

## Overview
The account rakibislam6028@gmail.com has now been registered (profile id
832dc71c-c4a9-43fd-8d0a-9dbca43bf776, full_name "Rakibislam"). The earlier
migration 0021 ran before the account existed, so it stayed role='user'.
This migration sets role='admin' on both the profiles table and the
auth.users raw_app_meta_data so isAdmin resolves to true.

## Changes
1. profiles.role -> 'admin' for the rakibislam6028@gmail.com account.
2. auth.users.raw_app_meta_data.role -> 'admin' (JWT fallback path).
3. Demote any other admin accounts to 'user' so rakibislam is the sole admin.

## Security
No data loss — only role flags updated. Idempotent.
*/

-- Promote rakibislam6028@gmail.com in profiles
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'rakibislam6028@gmail.com');

-- Promote in auth.users app_metadata (JWT fallback)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'rakibislam6028@gmail.com';

-- Demote every other admin back to user (sole admin = rakibislam)
UPDATE public.profiles
SET role = 'user'
WHERE role = 'admin'
  AND id NOT IN (SELECT id FROM auth.users WHERE email = 'rakibislam6028@gmail.com');

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role' || '{"role":"user"}'::jsonb
WHERE email <> 'rakibislam6028@gmail.com'
  AND COALESCE((raw_app_meta_data->>'role'), 'user') = 'admin';
