-- Add short_description to books table
-- Improve book management for admin

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS short_description text DEFAULT '';

-- Add view_count and download_count for system statistics
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0;

-- Update status check constraint to include 'coming_soon'
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE public.books ADD CONSTRAINT books_status_check 
  CHECK (status IN ('published','draft','coming_soon','archived'));

-- Create indexes for new toggles
CREATE INDEX IF NOT EXISTS books_new_arrival_idx ON public.books(is_new_arrival) WHERE is_new_arrival = true;
