/*
# Noor Library — Fix handle_new_user search_path

## Root Cause
The `handle_new_user()` trigger function had no `search_path` set
(`proconfig = null`). Supabase Auth runs triggers in a restricted
security context. Without an explicit `search_path`, the function
cannot reliably resolve the `public.profiles` table reference, and
the trigger fails during signUp/signIn — surfacing as
"Database error querying schema" on the frontend.

This is also required by the Supabase security update (CVE-2024-7348)
which blocks trigger functions without an explicit `search_path`.

## Fix
Recreate `handle_new_user()` with `SET search_path = public, auth`
so the `public.profiles` reference resolves correctly inside the
trigger context.

## Notes
1. Idempotent via `CREATE OR REPLACE`.
2. Preserves the SECURITY DEFINER property so the trigger can write
   to `public.profiles` regardless of the caller's RLS.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
