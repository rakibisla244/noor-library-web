import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Guards purchase actions (Buy Now, Add to Cart, Checkout).
 * If the user is not authenticated, shows a toast and redirects to /login
 * with `from` set to the current path so the user returns after signing in.
 * Returns `true` if the caller may proceed (user is signed in).
 */
export function usePurchaseGuard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useCallback((): boolean => {
    if (user) return true;
    toast('Please sign in to purchase eBooks.', 'info');
    navigate('/login', { state: { from: window.location.pathname, purchase: true } });
    return false;
  }, [user, toast, navigate]);
}
