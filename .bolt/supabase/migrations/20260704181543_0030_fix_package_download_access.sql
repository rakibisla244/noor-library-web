-- ============================================================
-- Fix: ensure package purchase → download access is always
-- created, even when books are added to package_items after
-- the order was approved.
-- ============================================================

-- 1. Drop and recreate the order-approval trigger function with
--    better logging and no silent failures.
CREATE OR REPLACE FUNCTION public.grant_package_book_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg_id  uuid;
  v_book_id uuid;
  v_count   int := 0;
BEGIN
  -- Only run when payment_status transitions TO 'approved'
  IF NEW.payment_status = 'approved' AND
     (OLD.payment_status IS DISTINCT FROM 'approved' OR OLD.payment_status IS NULL)
  THEN
    RAISE LOG '[grant_package_book_access] order % approved — granting package book access', NEW.id;

    FOR v_pkg_id IN
      SELECT package_id
      FROM public.order_items
      WHERE order_id   = NEW.id
        AND is_package = true
        AND package_id IS NOT NULL
    LOOP
      RAISE LOG '[grant_package_book_access] processing package %', v_pkg_id;

      FOR v_book_id IN
        SELECT book_id FROM public.package_items WHERE package_id = v_pkg_id
      LOOP
        INSERT INTO public.downloads (user_id, book_id, order_id)
        VALUES (NEW.user_id, v_book_id, NEW.id)
        ON CONFLICT ON CONSTRAINT downloads_user_book_order_unique DO NOTHING;

        v_count := v_count + 1;
        RAISE LOG '[grant_package_book_access] granted access: user=% book=% order=%',
          NEW.user_id, v_book_id, NEW.id;
      END LOOP;
    END LOOP;

    RAISE LOG '[grant_package_book_access] done — inserted % download records for order %',
      v_count, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. New trigger: when a book is added to package_items, immediately
--    backfill download access for ALL users who already have an
--    approved order for that package.
CREATE OR REPLACE FUNCTION public.backfill_package_book_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  -- For every approved order that includes this package, grant access
  FOR r IN
    SELECT DISTINCT o.user_id, o.id AS order_id
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.package_id   = NEW.package_id
      AND oi.is_package   = true
      AND o.payment_status = 'approved'
  LOOP
    INSERT INTO public.downloads (user_id, book_id, order_id)
    VALUES (r.user_id, NEW.book_id, r.order_id)
    ON CONFLICT ON CONSTRAINT downloads_user_book_order_unique DO NOTHING;

    RAISE LOG '[backfill_package_book_access] backfilled: user=% book=% order=%',
      r.user_id, NEW.book_id, r.order_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_package_item_inserted ON public.package_items;
CREATE TRIGGER on_package_item_inserted
  AFTER INSERT ON public.package_items
  FOR EACH ROW EXECUTE FUNCTION public.backfill_package_book_access();

-- 3. One-time backfill: create missing download records for all
--    existing approved package orders that are missing entries.
DO $$
DECLARE
  r record;
  inserted int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT o.user_id, pi.book_id, o.id AS order_id
    FROM public.orders          o
    JOIN public.order_items     oi ON oi.order_id   = o.id
                                  AND oi.is_package = true
                                  AND oi.package_id IS NOT NULL
    JOIN public.package_items   pi ON pi.package_id = oi.package_id
    WHERE o.payment_status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.downloads d
        WHERE d.user_id   = o.user_id
          AND d.book_id   = pi.book_id
          AND d.order_id  = o.id
      )
  LOOP
    INSERT INTO public.downloads (user_id, book_id, order_id)
    VALUES (r.user_id, r.book_id, r.order_id)
    ON CONFLICT ON CONSTRAINT downloads_user_book_order_unique DO NOTHING;

    inserted := inserted + 1;
    RAISE LOG '[backfill] inserted download: user=% book=% order=%',
      r.user_id, r.book_id, r.order_id;
  END LOOP;

  RAISE LOG '[backfill] total inserted: %', inserted;
END;
$$;
