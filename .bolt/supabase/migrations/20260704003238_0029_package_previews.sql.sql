/*
# Package Preview PDFs System

## Overview
Allows packages to have multiple preview PDFs (one for each included book or additional materials).

## New Table

### package_previews
Stores multiple preview PDFs for packages
- `id` (uuid, primary key)
- `package_id` (uuid, FK to book_packages)
- `title` (text) - Display title e.g. "Book 1 Preview"
- `file_url` (text) - URL to the preview PDF
- `file_size` (text) - Human readable file size
- `display_order` (integer, default 0)
- `created_at` (timestamptz)

## Security
- RLS enabled
- Public read for active packages
- Admin-only write access

## Notes
1. Admin can add unlimited preview PDFs
2. Each preview has a title for easy identification
3. Display order controls the listing order
*/

-- Create package_previews table
CREATE TABLE IF NOT EXISTS public.package_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.book_packages(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_size text DEFAULT 'Unknown',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_previews_package ON public.package_previews(package_id);
CREATE INDEX IF NOT EXISTS idx_package_previews_order ON public.package_previews(package_id, display_order);

ALTER TABLE public.package_previews ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "package_previews_public_read" ON public.package_previews;
CREATE POLICY "package_previews_public_read" ON public.package_previews FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.book_packages WHERE id = package_id)
  );

-- Admin full access
DROP POLICY IF EXISTS "package_previews_admin_all" ON public.package_previews;
CREATE POLICY "package_previews_admin_all" ON public.package_previews FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Remove the single preview_url column from book_packages (keep for backward compatibility but not use)
-- No action needed - we'll use the new table instead