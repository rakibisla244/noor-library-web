-- Add payment_number column to orders table for recording which number customer sent money to

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_number TEXT DEFAULT '01985270188';

-- Update existing orders with the default payment number if null
UPDATE public.orders SET payment_number = '01985270188' WHERE payment_number IS NULL OR payment_number = '';
