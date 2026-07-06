-- Drop and recreate admin_list_users with avatar_url
DROP FUNCTION IF EXISTS admin_list_users();

CREATE FUNCTION admin_list_users()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
IF NOT public.is_admin() THEN
RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE = '42501';
END IF;
RETURN QUERY
SELECT p.id, p.full_name, u.email, p.phone, p.avatar_url, p.role, p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
END;
$$;