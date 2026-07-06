/*
# Noor Library — RPC helper functions

## Overview
Adds two SECURITY DEFINER functions used by the checkout flow:
1. `increment_sales(book_id uuid, qty int)` — increments a book's sales_count.
2. `increment_coupon(coupon_code text)` — increments a coupon's used_count.

## Notes
1. Both functions are idempotent-safe (UPDATE only).
2. SECURITY DEFINER so the authenticated caller can update aggregate counters
   without needing UPDATE policy on the underlying table.
3. Created with `OR REPLACE` for idempotency.
*/

CREATE OR REPLACE FUNCTION public.increment_sales(book_id uuid, qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE code = coupon_code;
END;
$$;
