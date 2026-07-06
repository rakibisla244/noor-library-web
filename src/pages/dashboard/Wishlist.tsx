import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatBDT, effectivePrice } from '../../lib/types';
import EmptyState from '../../components/ui/EmptyState';

export default function Wishlist() {
  const { items, toggle, loading } = useWishlist();
  const { addBook } = useCart();
  const { toast } = useToast();

  if (loading) {
    return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-xl" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">My Wishlist</h1>
        <p className="mt-1 text-sm text-ink-500">Books you have saved to read later.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save books you love by clicking the heart icon on any book."
          action={<Link to="/shop" className="btn-primary">Browse Books</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((book) => {
            const price = effectivePrice(book);
            return (
              <div key={book.id} className="card flex gap-4 p-4">
                <Link to={`/book/${book.slug}`} className="shrink-0">
                  <img src={book.cover_url} alt={book.title} className="h-24 w-16 rounded-lg object-cover sm:h-28 sm:w-20" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link to={`/book/${book.slug}`} className="line-clamp-2 font-semibold text-ink-900 hover:text-emerald-700">
                    {book.title}
                  </Link>
                  <p className="text-xs text-ink-500">{book.author}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">{formatBDT(price)}</p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <button
                      onClick={() => { addBook(book); toast('Added to cart', 'success'); }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                    </button>
                    <button
                      onClick={() => { toggle(book); toast('Removed from wishlist', 'info'); }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-red-200 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
