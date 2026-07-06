/*
# Admin Notification System + Email Dispatch

## Overview
Expands the existing `notifications` table into a full admin notification center
and adds Gmail email alerts for every customer activity (orders, payments,
support tickets, reviews). Notifications are created by database triggers so
they fire regardless of which client inserts the row, and a `notify_admin_email`
plpgsql function queues an email request that an edge function drains.

## Changes

### 1. notifications table
- Add new notification types: `new_order`, `new_payment`, `new_review`.
  (Existing types `payment_pending`, `new_order`, `new_customer`,
  `payment_approved`, `payment_rejected`, `new_ticket` are preserved.)
- Add `admin_email_sent boolean DEFAULT false` to track whether the Gmail
  alert has been dispatched for this notification.
- Add DELETE policy so admins can delete notifications from the center.

### 2. admin_email_queue table (NEW)
- Stores outbound admin email requests drained by the `send-admin-email`
  edge function on a schedule / on-demand.
  - id, notification_id (nullable FK), to_email, subject, html_body,
    status ('pending'|'sent'|'failed'), created_at, sent_at.
- RLS: admins only (read/update), service role inserts via triggers.

### 3. Triggers
- `notify_new_order` — AFTER INSERT on orders: inserts a `new_order`
  notification AND a `new_payment` notification (since order placement ==
  payment submission in this flow), then enqueues the admin email.
- `notify_new_review` — AFTER INSERT on reviews: inserts a `new_review`
  notification and enqueues admin email.
- (Support tickets already have `notify_new_support_ticket` from a prior
  migration; we extend it to also enqueue the admin email.)

### 4. Helper functions
- `enqueue_admin_email(p_subject text, p_html text, p_notification_id uuid)`
  SECURITY DEFINER — inserts a row into admin_email_queue for every admin
  profile, addressed to the configured admin Gmail. Uses the
  `ADMIN_NOTIFY_EMAIL` project config setting when present, falling back
  to the first admin's auth email.
- `build_order_email_html(...)` — builds the HTML body with customer name,
  email, book name(s), order number, amount, payment method, txn id, date.

## Security
- RLS enabled on `admin_email_queue`; admins can read/update, service role
  (triggers) can insert.
- All trigger functions are SECURITY DEFINER with `search_path = ''` to
  avoid search-path hijacking.
- No data is lost: only additive changes (new columns, new table, new
  triggers). No DROP of existing columns/tables.
*/

-- ---------- 1. Expand notifications types ----------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'payment_pending', 'new_order', 'new_customer',
    'payment_approved', 'payment_rejected',
    'new_ticket', 'new_payment', 'new_review'
  ));

-- Track whether the Gmail alert has been sent for this notification
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS admin_email_sent boolean NOT NULL DEFAULT false;

-- Allow admins to delete notifications (notification center feature)
DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
CREATE POLICY "notifications_admin_delete" ON public.notifications FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- 2. admin_email_queue table ----------
CREATE TABLE IF NOT EXISTS public.admin_email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_email_queue_status ON public.admin_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_email_queue_created ON public.admin_email_queue(created_at DESC);

ALTER TABLE public.admin_email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_email_queue_admin_read" ON public.admin_email_queue;
CREATE POLICY "admin_email_queue_admin_read" ON public.admin_email_queue FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_email_queue_admin_update" ON public.admin_email_queue;
CREATE POLICY "admin_email_queue_admin_update" ON public.admin_email_queue FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Service role bypasses RLS, so triggers (SECURITY DEFINER) can insert.

-- ---------- 3. Helper: enqueue admin email ----------
-- Resolves the destination admin Gmail. Priority:
--   1. project config setting 'ADMIN_NOTIFY_EMAIL'
--   2. first admin profile's auth.users email
CREATE OR REPLACE FUNCTION public.enqueue_admin_email(
  p_subject text,
  p_html text,
  p_notification_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_to text;
BEGIN
  BEGIN
    SELECT value INTO v_to FROM public.settings WHERE key = 'ADMIN_NOTIFY_EMAIL';
  EXCEPTION WHEN OTHERS THEN
    v_to := NULL;
  END;

  IF v_to IS NULL OR v_to = '' THEN
    -- fall back to first admin's email from auth.users
    SELECT u.email INTO v_to
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'admin'
    ORDER BY p.created_at ASC
    LIMIT 1;
  END IF;

  IF v_to IS NULL OR v_to = '' THEN
    RETURN; -- no admin to notify
  END IF;

  INSERT INTO public.admin_email_queue (notification_id, to_email, subject, html_body)
  VALUES (p_notification_id, v_to, p_subject, p_html);
END;
$$;

-- ---------- 4. Helper: build order email HTML ----------
CREATE OR REPLACE FUNCTION public.build_order_email_html(
  p_event text,
  p_order_number text,
  p_customer_name text,
  p_customer_email text,
  p_book_names text,
  p_amount numeric,
  p_payment_method text,
  p_txn_id text,
  p_created_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">'
    || '<div style="background:#047857;padding:24px;color:#fff">'
    || '<h1 style="margin:0;font-size:20px;font-weight:700">' || p_event || '</h1>'
    || '<p style="margin:4px 0 0;opacity:.9;font-size:13px">Noor Library Admin Alert</p>'
    || '</div>'
    || '<div style="padding:24px">'
    || '<table style="width:100%;font-size:14px;color:#111827;border-collapse:collapse">'
    || '<tr><td style="padding:10px 0;color:#6b7280;width:40%">Customer Name</td><td style="padding:10px 0;font-weight:600">' || COALESCE(p_customer_name,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Customer Email</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(p_customer_email,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Book Name</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(p_book_names,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Order Number</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(p_order_number,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Amount</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">৳' || COALESCE(p_amount,0) || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Payment Method</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(p_payment_method,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Transaction ID</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(p_txn_id,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Date &amp; Time</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || to_char(p_created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD HH24:MI:SS') || ' (BDT)</td></tr>'
    || '</table>'
    || '<p style="margin-top:24px;font-size:12px;color:#9ca3af">This is an automated notification from the Noor Library admin system.</p>'
    || '</div></div>';
END;
$$;

-- ---------- 5. Trigger: new order + new payment ----------
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_notif_id uuid;
  v_book_names text;
  v_html text;
BEGIN
  -- Gather book titles for this order
  SELECT COALESCE(string_agg(book_title, ', '), '-')
    INTO v_book_names
  FROM public.order_items
  WHERE order_id = NEW.id;

  -- new_order notification
  INSERT INTO public.notifications (type, title, message, data, order_id, user_id)
  VALUES (
    'new_order',
    'New Order Placed',
    'Order ' || NEW.order_number || ' by ' || NEW.customer_name || ' — ৳' || NEW.total,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'amount', NEW.total,
      'payment_method', NEW.payment_method,
      'txn_id', NEW.txn_id,
      'book_names', v_book_names
    ),
    NEW.id, NEW.user_id
  )
  RETURNING id INTO v_notif_id;

  -- Enqueue admin email
  v_html := public.build_order_email_html(
    'New Order Placed',
    NEW.order_number, NEW.customer_name, NEW.customer_email,
    v_book_names, NEW.total, NEW.payment_method, NEW.txn_id, NEW.created_at
  );
  PERFORM public.enqueue_admin_email(
    '[Noor Library] New Order ' || NEW.order_number,
    v_html, v_notif_id
  );

  -- Also create a new_payment notification (payment submitted with order)
  INSERT INTO public.notifications (type, title, message, data, order_id, user_id)
  VALUES (
    'new_payment',
    'New Payment Submitted',
    'Payment for order ' || NEW.order_number || ' via ' || NEW.payment_method || ' — ৳' || NEW.total,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'amount', NEW.total,
      'payment_method', NEW.payment_method,
      'txn_id', NEW.txn_id
    ),
    NEW.id, NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_order ON public.orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

-- ---------- 6. Trigger: new review ----------
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_notif_id uuid;
  v_book_title text;
  v_customer_name text;
  v_customer_email text;
  v_html text;
BEGIN
  SELECT title INTO v_book_title FROM public.books WHERE id = NEW.book_id;
  SELECT full_name INTO v_customer_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (type, title, message, data, user_id)
  VALUES (
    'new_review',
    'New Review Submitted',
    'Review (' || NEW.rating || '★) on "' || COALESCE(v_book_title,'-') || '" by ' || COALESCE(v_customer_name,'-'),
    jsonb_build_object(
      'book_id', NEW.book_id,
      'book_title', v_book_title,
      'rating', NEW.rating,
      'comment', NEW.comment,
      'customer_name', v_customer_name
    ),
    NEW.user_id
  )
  RETURNING id INTO v_notif_id;

  v_html := '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">'
    || '<div style="background:#047857;padding:24px;color:#fff"><h1 style="margin:0;font-size:20px;font-weight:700">New Review Submitted</h1>'
    || '<p style="margin:4px 0 0;opacity:.9;font-size:13px">Noor Library Admin Alert</p></div>'
    || '<div style="padding:24px"><table style="width:100%;font-size:14px;color:#111827;border-collapse:collapse">'
    || '<tr><td style="padding:10px 0;color:#6b7280;width:40%">Customer Name</td><td style="padding:10px 0;font-weight:600">' || COALESCE(v_customer_name,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Book Name</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(v_book_title,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Rating</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || NEW.rating || ' / 5</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Comment</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(NEW.comment,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Date &amp; Time</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || to_char(NEW.created_at AT TIME ZONE 'Asia/Dhaka','YYYY-MM-DD HH24:MI:SS') || ' (BDT)</td></tr>'
    || '</table><p style="margin-top:24px;font-size:12px;color:#9ca3af">Automated notification from Noor Library admin system.</p></div></div>';

  PERFORM public.enqueue_admin_email(
    '[Noor Library] New Review on "' || COALESCE(v_book_title,'-') || '"',
    v_html, v_notif_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_review ON public.reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();

-- ---------- 7. Extend support ticket trigger to enqueue email ----------
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_notif_id uuid;
  v_html text;
BEGIN
  INSERT INTO public.notifications (type, title, message, data)
  VALUES (
    'new_ticket',
    'New Support Ticket',
    'You have a new customer support message.',
    jsonb_build_object('ticket_id', NEW.id, 'subject', NEW.subject, 'name', NEW.name)
  )
  RETURNING id INTO v_notif_id;

  v_html := '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">'
    || '<div style="background:#047857;padding:24px;color:#fff"><h1 style="margin:0;font-size:20px;font-weight:700">New Support Ticket</h1>'
    || '<p style="margin:4px 0 0;opacity:.9;font-size:13px">Noor Library Admin Alert</p></div>'
    || '<div style="padding:24px"><table style="width:100%;font-size:14px;color:#111827;border-collapse:collapse">'
    || '<tr><td style="padding:10px 0;color:#6b7280;width:40%">Customer Name</td><td style="padding:10px 0;font-weight:600">' || COALESCE(NEW.name,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Customer Email</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(NEW.email,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Subject</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(NEW.subject,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Message</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || COALESCE(NEW.message,'-') || '</td></tr>'
    || '<tr><td style="padding:10px 0;color:#6b7280;border-top:1px solid #f3f4f6">Date &amp; Time</td><td style="padding:10px 0;font-weight:600;border-top:1px solid #f3f4f6">' || to_char(NEW.created_at AT TIME ZONE 'Asia/Dhaka','YYYY-MM-DD HH24:MI:SS') || ' (BDT)</td></tr>'
    || '</table><p style="margin-top:24px;font-size:12px;color:#9ca3af">Automated notification from Noor Library admin system.</p></div></div>';

  PERFORM public.enqueue_admin_email(
    '[Noor Library] New Support Ticket: ' || COALESCE(NEW.subject,'-'),
    v_html, v_notif_id
  );

  RETURN NEW;
END;
$$;

-- ---------- 8. Seed default admin notify email setting ----------
INSERT INTO public.settings (key, value)
VALUES ('ADMIN_NOTIFY_EMAIL', 'rakibislam6028@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
