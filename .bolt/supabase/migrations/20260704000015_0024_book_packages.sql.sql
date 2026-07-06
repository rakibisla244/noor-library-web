/*
# Book Package/Bundle System

## Overview
Creates a new product type called "Package" that allows admins to group multiple
books together and sell them as a bundle at a special price.

## New Tables

### 1. book_packages
Stores package metadata (name, cover, pricing, etc.)
- `id` (uuid, primary key)
- `name` (text, not null) - Package name e.g. "Ramadan Collection"
- `slug` (text, unique) - URL-friendly identifier
- `description` (text) - Package description
- `cover_url` (text) - Package cover image URL
- `price` (numeric, not null) - Package selling price
- `original_price` (numeric, nullable) - Optional original price for showing savings
- `is_active` (boolean, default true) - Whether package is available for purchase
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. package_items
Junction table linking packages to their included books
- `id` (uuid, primary key)
- `package_id` (uuid, FK to book_packages)
- `book_id` (uuid, FK to books)
- `created_at` (timestamptz)
- Unique constraint on (package_id, book_id) to prevent duplicates

## Modified Tables

### order_items
Added columns to support package purchases:
- `package_id` (uuid, nullable, FK to book_packages) - NULL for single book purchases
- `is_package` (boolean, default false) - True when this item is a package

## Security
- RLS enabled on both new tables
- Public read access for active packages (anon + authenticated)
- Admin-only write access (using is_admin() function)

## Important Notes
1. Packages can contain unlimited books (2, 5, 10, 50, etc.)
2. When a package is purchased, all included books become downloadable
3. Package prices are independent of individual book prices
4. Savings are calculated as: original_price - price OR sum of individual book prices - package price
*/

-- ========== 1. Create book_packages table ==========
CREATE TABLE IF NOT EXISTS public.book_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_url text,
  price numeric NOT NULL CHECK (price >= 0),
  original_price numeric CHECK (original_price IS NULL OR original_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_packages_slug ON public.book_packages(slug);
CREATE INDEX IF NOT EXISTS idx_book_packages_active ON public.book_packages(is_active);

ALTER TABLE public.book_packages ENABLE ROW LEVEL SECURITY;

-- Public read access for active packages
DROP POLICY IF EXISTS "packages_public_read" ON public.book_packages;
CREATE POLICY "packages_public_read" ON public.book_packages FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- Admin full access
DROP POLICY IF EXISTS "packages_admin_all" ON public.book_packages;
CREATE POLICY "packages_admin_all" ON public.book_packages FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== 2. Create package_items table ==========
CREATE TABLE IF NOT EXISTS public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.book_packages(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_items_unique UNIQUE (package_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_package_items_package ON public.package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_book ON public.package_items(book_id);

ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "package_items_public_read" ON public.package_items;
CREATE POLICY "package_items_public_read" ON public.package_items FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.book_packages WHERE id = package_id)
  );

-- Admin full access
DROP POLICY IF EXISTS "package_items_admin_all" ON public.package_items;
CREATE POLICY "package_items_admin_all" ON public.package_items FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== 3. Add package support to order_items ==========
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.book_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_package boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_items_package ON public.order_items(package_id);

-- ========== 4. Helper function to calculate package original price ==========
-- Returns sum of all included book prices if no original_price is set
CREATE OR REPLACE FUNCTION public.get_package_original_price(p_package_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_pkg_price numeric;
  v_books_sum numeric;
BEGIN
  -- Get package's set original price
  SELECT original_price INTO v_pkg_price
  FROM public.book_packages WHERE id = p_package_id;
  
  IF v_pkg_price IS NOT NULL THEN
    RETURN v_pkg_price;
  END IF;
  
  -- Fallback: sum of effective prices of all included books
  SELECT COALESCE(SUM(
    COALESCE(b.discount_price, b.price)
  ), 0) INTO v_books_sum
  FROM public.package_items pi
  JOIN public.books b ON b.id = pi.book_id
  WHERE pi.package_id = p_package_id;
  
  RETURN v_books_sum;
END;
$$;

-- ========== 5. Function to get package book count ==========
CREATE OR REPLACE FUNCTION public.get_package_book_count(p_package_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.package_items
  WHERE package_id = p_package_id;
  
  RETURN v_count;
END;
$$;

-- ========== 6. Trigger to auto-update updated_at ==========
DROP TRIGGER IF EXISTS on_package_update ON public.book_packages;
CREATE OR REPLACE FUNCTION public.update_package_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_package_update
  BEFORE UPDATE ON public.book_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_package_updated_at();