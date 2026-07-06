/*
# Enhanced Package System with Gallery and Extended Fields

## Overview
Upgrades the package system to match the full Book Details experience with:
- Image gallery support
- Extended metadata (author, language, features, etc.)
- Preview PDF support
- Featured/Bestseller flags

## New Tables

### 1. package_gallery_images
Stores unlimited gallery images for packages
- `id` (uuid, primary key)
- `package_id` (uuid, FK to book_packages)
- `image_url` (text, not null)
- `display_order` (integer, default 0)
- `created_at` (timestamptz)

## Modified Tables

### book_packages
Added new columns:
- `author` (text) - Package author/creator
- `language` (text) - Primary language
- `category_id` (uuid, FK to categories)
- `features` (jsonb) - Array of features/benefits
- `tags` (jsonb) - Array of tags
- `islamic_topic` (text) - Islamic topic category
- `page_count` (integer) - Total pages of all included books
- `preview_url` (text) - Preview PDF URL
- `is_featured` (boolean)
- `is_bestseller` (boolean)
- `rating` (numeric, default 0)
- `review_count` (integer, default 0)
- `sales_count` (integer, default 0)
- `view_count` (integer, default 0)

## Security
- RLS enabled on gallery table
- Admin-only write access
- Public read for active packages

## Notes
1. Gallery supports unlimited images
2. `features` is stored as JSON array e.g. ["Instant Access", "Lifetime Download"]
3. All new fields are optional for backward compatibility
*/

-- ========== 1. Enhance book_packages table ==========
ALTER TABLE public.book_packages
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'Bangla',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS islamic_topic text,
  ADD COLUMN IF NOT EXISTS page_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_packages_category ON public.book_packages(category_id);
CREATE INDEX IF NOT EXISTS idx_packages_featured ON public.book_packages(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_packages_bestseller ON public.book_packages(is_bestseller) WHERE is_bestseller = true;

-- ========== 2. Create package_gallery_images table ==========
CREATE TABLE IF NOT EXISTS public.package_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.book_packages(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_gallery_package ON public.package_gallery_images(package_id);
CREATE INDEX IF NOT EXISTS idx_package_gallery_order ON public.package_gallery_images(package_id, display_order);

ALTER TABLE public.package_gallery_images ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "package_gallery_public_read" ON public.package_gallery_images;
CREATE POLICY "package_gallery_public_read" ON public.package_gallery_images FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.book_packages WHERE id = package_id)
  );

-- Admin full access
DROP POLICY IF EXISTS "package_gallery_admin_all" ON public.package_gallery_images;
CREATE POLICY "package_gallery_admin_all" ON public.package_gallery_images FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== 3. Create storage bucket for package images ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for package-images bucket
CREATE POLICY "package_images_public_read" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'package-images');

CREATE POLICY "package_images_authenticated_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'package-images' AND public.is_admin());

CREATE POLICY "package_images_authenticated_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'package-images' AND public.is_admin());

CREATE POLICY "package_images_authenticated_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'package-images' AND public.is_admin());

-- ========== 4. Function to increment view count ==========
CREATE OR REPLACE FUNCTION public.increment_package_view(pkg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.book_packages
  SET view_count = view_count + 1
  WHERE id = pkg_id;
END;
$$;