-- Manual Payment Verification System
-- Changes payment_status to support pending_verification, approved, rejected
-- Adds sender_mobile column for customer's mobile number

-- Step 1: Drop existing check constraint first
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Step 2: Drop sslcommerz from payment_method check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Step 3: Add sender_mobile column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sender_mobile TEXT DEFAULT ''::text;

-- Step 4: Update existing orders to use new status names
UPDATE public.orders SET payment_status = 'approved' WHERE payment_status = 'paid';

-- Step 5: Add new payment_status constraint with new values
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'pending_verification'::text, 'approved'::text, 'rejected'::text, 'failed'::text, 'refunded'::text]));

-- Step 6: Add new payment_method constraint (without sslcommerz)
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['bkash'::text, 'nagad'::text, 'rocket'::text]));

-- Step 7: Add payment number settings
INSERT INTO public.settings (key, value) VALUES
  ('bkash_number', '01700-000000'),
  ('nagad_number', '01800-000000'),
  ('rocket_number', '01900-000000')
ON CONFLICT (key) DO NOTHING;
