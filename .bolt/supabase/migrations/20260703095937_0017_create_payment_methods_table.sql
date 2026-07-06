-- Payment Methods Management Table
-- Stores configuration for each mobile payment method

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id text PRIMARY KEY, -- 'bkash', 'nagad', 'rocket'
  name text NOT NULL, -- Display name 'bKash', 'Nagad', 'Rocket'
  is_enabled boolean NOT NULL DEFAULT true,
  account_number text NOT NULL DEFAULT '',
  account_type text NOT NULL DEFAULT 'Personal' CHECK (account_type IN ('Personal', 'Agent', 'Merchant')),
  color text NOT NULL DEFAULT '#000000',
  logo text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Allow public read (customers need to see enabled methods)
DROP POLICY IF EXISTS "payment_methods_read_public" ON public.payment_methods;
CREATE POLICY "payment_methods_read_public" ON public.payment_methods FOR SELECT
  TO anon, authenticated USING (true);

-- Only admin can update
DROP POLICY IF EXISTS "payment_methods_admin_all" ON public.payment_methods;
CREATE POLICY "payment_methods_admin_all" ON public.payment_methods FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default payment methods
INSERT INTO public.payment_methods (id, name, is_enabled, account_number, account_type, color, logo, display_order) VALUES
  ('bkash', 'bKash', true, '01985270188', 'Personal', '#e2136e', 'bK', 1),
  ('nagad', 'Nagad', false, '', 'Personal', '#f16822', 'N', 2),
  ('rocket', 'Rocket', false, '', 'Personal', '#8b3a9f', 'R', 3)
ON CONFLICT (id) DO UPDATE SET
  account_number = EXCLUDED.account_number,
  account_type = EXCLUDED.account_type,
  is_enabled = EXCLUDED.is_enabled;
