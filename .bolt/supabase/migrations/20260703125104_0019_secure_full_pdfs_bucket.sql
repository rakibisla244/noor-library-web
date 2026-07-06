-- Make full-pdfs bucket PRIVATE (not publicly accessible)
-- Only authenticated users who have purchased can download via edge function

UPDATE storage.buckets SET public = false WHERE id = 'full-pdfs';

-- Drop the public read policy
DROP POLICY IF EXISTS "full_pdfs_public_read" ON storage.objects;

-- Allow authenticated users to read (actual purchase check done in edge function)
CREATE POLICY "full_pdfs_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'full-pdfs');
