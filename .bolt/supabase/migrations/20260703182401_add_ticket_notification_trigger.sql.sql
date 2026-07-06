-- Create trigger to notify admins of new support tickets
CREATE OR REPLACE FUNCTION notify_new_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert notification for all admin users
  INSERT INTO notifications (type, title, message, data)
  SELECT 
    'new_ticket',
    'New Support Ticket',
    'You have a new customer support message.',
    jsonb_build_object('ticket_id', NEW.id, 'subject', NEW.subject, 'name', NEW.name)
  FROM profiles
  WHERE role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_new_support_ticket ON support_tickets;
CREATE TRIGGER on_new_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_new_support_ticket();