-- RPC function to check if a user has access to a book through package purchases
CREATE OR REPLACE FUNCTION public.check_package_book_access(
  p_user_id uuid,
  p_book_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Check if user has an approved order containing a package that includes this book
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN package_items pi ON pi.package_id = oi.package_id
    WHERE o.user_id = p_user_id
      AND o.payment_status = 'approved'
      AND oi.is_package = true
      AND oi.package_id IS NOT NULL
      AND pi.book_id = p_book_id
  ) INTO has_access;

  RETURN has_access;
END;
$$;