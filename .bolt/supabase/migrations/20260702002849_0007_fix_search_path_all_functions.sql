/*
# Noor Library — Fix search_path on all SECURITY DEFINER functions

## Root Cause
Several SECURITY DEFINER functions had no `search_path` set
(`proconfig = null`). Without an explicit `search_path`, these
functions can fail or behave unpredictably when invoked from
RLS policies or triggers — the same class of bug that caused
the "Database error querying schema" auth error.

## Fix
Recreate all SECURITY DEFINER functions with
`SET search_path = public, auth` so table references resolve
correctly regardless of the caller's search_path.

## Functions Fixed
1. `is_admin()` — used by every admin RLS policy
2. `increment_sales()` — used at checkout
3. `increment_coupon()` — used at checkout
4. `admin_list_users()` — used by the admin Users page

## Notes
1. Idempotent via `CREATE OR REPLACE`.
2. Preserves SECURITY DEFINER on all functions.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
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

CREATE OR REPLACE FUNCTION public.increment_sales(book_id uuid, qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books
  SET sales_count = sales_count + qty
  WHERE id = book_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_coupon(coupon_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE code = coupon_code;
END;
$$;

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
SET search_path = public, auth
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
