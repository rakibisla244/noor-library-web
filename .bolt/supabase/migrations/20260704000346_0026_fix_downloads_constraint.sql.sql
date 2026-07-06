/*
# Fix Downloads Unique Constraint and Trigger

## Changes
1. Add unique constraint on (user_id, book_id, order_id) to prevent duplicate downloads
2. Fix the trigger to work without ON CONFLICT (since constraint name is custom)

## Security
- Maintains data integrity
- Prevents duplicate download records
*/

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'downloads_user_book_order_unique'
  ) THEN
    ALTER TABLE public.downloads 
    ADD CONSTRAINT downloads_user_book_order_unique 
    UNIQUE (user_id, book_id, order_id);
  END IF;
END $$;