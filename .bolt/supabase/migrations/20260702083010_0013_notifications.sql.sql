-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('payment_pending', 'new_order', 'new_customer', 'payment_approved', 'payment_rejected')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read all notifications
DROP POLICY IF EXISTS "notifications_admin_read" ON public.notifications;
CREATE POLICY "notifications_admin_read" ON public.notifications FOR SELECT
  TO authenticated USING (public.is_admin());

-- Admins can update notifications (mark as read)
DROP POLICY IF EXISTS "notifications_admin_update" ON public.notifications;
CREATE POLICY "notifications_admin_update" ON public.notifications FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Authenticated users can insert (for system notifications)
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (true);