-- Fix review system: auto-approve reviews, prevent duplicates, auto-update book rating

-- 1. Add unique constraint: one review per user per book
DROP INDEX IF EXISTS reviews_user_book_uniq;
CREATE UNIQUE INDEX reviews_user_book_uniq ON public.reviews(user_id, book_id);

-- 2. Auto-approve existing pending reviews
UPDATE public.reviews SET status = 'approved' WHERE status = 'pending';

-- 3. Function to recalculate book rating + review_count from reviews
CREATE OR REPLACE FUNCTION public.update_book_rating(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating numeric(3,2);
  cnt int;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO avg_rating, cnt
  FROM public.reviews
  WHERE book_id = p_book_id AND status = 'approved';

  UPDATE public.books
    SET rating = ROUND(avg_rating, 1),
        review_count = cnt
  WHERE id = p_book_id;
END;
$$;

-- 4. Trigger function that handles insert/update/delete
CREATE OR REPLACE FUNCTION public.reviews_rating_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.update_book_rating(OLD.book_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_book_rating(NEW.book_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS reviews_after_change ON public.reviews;
CREATE TRIGGER reviews_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_rating_trigger_fn();

-- 5. Recalculate ratings for all books that have reviews
DO $$
DECLARE
  b_id uuid;
BEGIN
  FOR b_id IN SELECT DISTINCT book_id FROM public.reviews WHERE status = 'approved'
  LOOP
    PERFORM public.update_book_rating(b_id);
  END LOOP;
END;
$$;
