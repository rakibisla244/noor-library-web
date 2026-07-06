-- Enable pg_net for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to trigger the send-admin-email edge function
CREATE OR REPLACE FUNCTION public.trigger_email_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Use pg_net to call the edge function
  PERFORM net.http_post(
    url := 'https://qqccvxfbbcddvdrarbfi.supabase.co/functions/v1/send-admin-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;