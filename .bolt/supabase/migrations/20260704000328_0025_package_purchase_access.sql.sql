/*
# Package Purchase Access Automation

## Overview
When a payment is approved for an order that contains a package, automatically
grant download access to all books included in that package.

## Changes

### 1. Downloads table enhancement (if needed)
No changes - downloads table already supports individual book access.

### 2. Trigger function: grant_package_book_access
- Called when order payment_status changes to 'approved'
- Finds all order_items where is_package = true
- For each package item, inserts downloads for all included books
- Ensures users can download all PDFs from a package purchase

### 3. Trigger on orders
- AFTER UPDATE of payment_status to 'approved'
- Calls grant_package_book_access

## Security
- Uses SECURITY DEFINER for elevated permissions
- Only triggers on approved payments
- Maintains data integrity

## Notes
1. This ensures when an admin approves a payment containing a package, the user
   automatically gets access to all books in that package.
2. Each book in the package gets its own download record.
*/

-- Function to grant access to all books in a purchased package
CREATE OR REPLACE FUNCTION public.grant_package_book_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_item record;
  v_book_id uuid;
BEGIN
  -- Only process when payment_status changes to 'approved'
  IF NEW.payment_status = 'approved' AND (
    OLD.payment_status IS DISTINCT FROM 'approved' OR TG_OP = 'INSERT'
  ) THEN
    -- Find all package items in this order
    FOR v_order_item IN
      SELECT oi.id, oi.package_id, oi.user_id, o.id as order_id
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.order_id = NEW.id
        AND oi.is_package = true
        AND oi.package_id IS NOT NULL
    LOOP
      -- Insert downloads for each book in the package
      FOR v_book_id IN
        SELECT book_id FROM public.package_items WHERE package_id = v_order_item.package_id
      LOOP
        INSERT INTO public.downloads (user_id, book_id, order_id)
        VALUES (v_order_item.user_id, v_book_id, v_order_item.order_id)
        ON CONFLICT (user_id, book_id, order_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on orders to grant package book access on approval
DROP TRIGGER IF EXISTS on_order_approved ON public.orders;
CREATE TRIGGER on_order_approved
  AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_package_book_access();