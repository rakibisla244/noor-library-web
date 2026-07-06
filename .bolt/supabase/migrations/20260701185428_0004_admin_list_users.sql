/*
# Noor Library — Admin list users RPC

## Overview
Adds a SECURITY DEFINER function `admin_list_users()` that returns all profiles
joined with their email from auth.users. Only callable by admins (RLS on the
function is enforced via the is_admin() check inside).

## Notes
1. SECURITY DEFINER so the function can read auth.users.
2. Returns: id, full_name, email, phone, role, created_at.
3. Idempotent via OR REPLACE.
*/

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, u.email, p.phone, p.role, p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
