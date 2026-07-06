-- Create storage buckets for book files
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('book-covers', 'book-covers', true),
  ('preview-pdfs', 'preview-pdfs', true),
  ('full-pdfs', 'full-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for book-covers bucket
CREATE POLICY "book_covers_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE POLICY "book_covers_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'book-covers' AND auth.uid()::text = owner_id)
  WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "book_covers_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'book-covers' AND auth.uid()::text = owner_id);

-- RLS policies for preview-pdfs bucket
CREATE POLICY "preview_pdfs_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'preview-pdfs');

CREATE POLICY "preview_pdfs_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'preview-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "preview_pdfs_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'preview-pdfs' AND auth.uid()::text = owner_id)
  WITH CHECK (bucket_id = 'preview-pdfs');

CREATE POLICY "preview_pdfs_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'preview-pdfs' AND auth.uid()::text = owner_id);

-- RLS policies for full-pdfs bucket
CREATE POLICY "full_pdfs_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'full-pdfs');

CREATE POLICY "full_pdfs_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'full-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "full_pdfs_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'full-pdfs' AND auth.uid()::text = owner_id)
  WITH CHECK (bucket_id = 'full-pdfs');

CREATE POLICY "full_pdfs_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'full-pdfs' AND auth.uid()::text = owner_id);