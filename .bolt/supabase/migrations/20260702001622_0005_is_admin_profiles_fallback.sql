/*
# Noor Library — Make is_admin() check profiles table too

## Overview
The `is_admin()` helper previously only checked the JWT `app_metadata.role`.
That meant a user whose `profiles.role` was 'admin' but whose JWT didn't
carry the role claim would be blocked by admin RLS policies — even though
the frontend correctly showed them as an admin.

## Changes
1. `is_admin()` now checks `auth.users` JWT metadata first (fast path), then
   falls back to a `profiles` table lookup for the authenticated user.
2. SECURITY DEFINER so it can read `public.profiles` regardless of the
   caller's RLS.

## Notes
1. Idempotent via `OR REPLACE`.
2. The profiles read is scoped to `auth.uid()` so it only ever reflects the
   current user's own role — no privilege escalation.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
$$;
