-- Allow users to insert their own profile row (safety net for when the
-- handle_new_user trigger doesn't fire or the row is missing).
-- The trigger runs as SECURITY DEFINER and bypasses RLS, but the
-- AuthContext fallback upsert from the client needs this policy.
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
