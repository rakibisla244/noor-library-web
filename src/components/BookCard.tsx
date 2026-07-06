import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, BookOpen, Star } from 'lucide-react';
import type { Book } from '../lib/types';
import { formatBDT, discountPercent, effectivePrice } from '../lib/types';

interface BookCardProps {
  book: Book;
  onAddToCart?: (book: Book) => void;
  onToggleWishlist?: (book: Book) => void;
  inWishlist?: boolean;
}

export default function BookCard({ book, onAddToCart, onToggleWishlist, inWishlist }: BookCardProps) {
  const discount = discountPercent(book.price, book.discount_price);
  const price = effectivePrice(book);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
      <Link to={`/book/${book.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-ink-100">
        <img
          src={book.cover_url}
          alt={book.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1.5 text-[10px] font-bold text-white shadow-md sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
            -{discount}%
          </span>
        )}
        {book.is_bestseller && (
          <span className="absolute right-2 top-2 rounded-full bg-gold-400 px-2 py-1.5 text-[10px] font-bold text-ink-900 shadow-md sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
            Bestseller
          </span>
        )}
        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 translate-y-4 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-700 shadow-md backdrop-blur transition hover:bg-emerald-50 hover:text-emerald-700">
            <BookOpen className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-0.5 flex items-center gap-1 sm:mb-1">
          <Star className="h-3 w-3 fill-gold-400 text-gold-400 sm:h-3.5 sm:w-3.5" />
          <span className="text-[10px] font-semibold text-ink-700 sm:text-xs">{book.rating.toFixed(1)}</span>
          <span className="text-[10px] text-ink-400 sm:text-xs">• {book.language}</span>
        </div>
        <Link to={`/book/${book.slug}`}>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-900 transition-colors hover:text-emerald-700 sm:text-base">
            {book.title}
          </h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500 sm:mt-1 sm:text-sm">{book.author}</p>
        {book.short_description && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-400 sm:mt-2 sm:text-xs">{book.short_description}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2 sm:pt-3">
          <div className="min-w-0 flex-1">
            {discount > 0 ? (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:flex-nowrap sm:gap-2">
                <span className="whitespace-nowrap text-base font-bold text-emerald-700 sm:text-lg">{formatBDT(price)}</span>
                <span className="whitespace-nowrap text-xs text-ink-400 line-through sm:text-sm">{formatBDT(book.price)}</span>
              </div>
            ) : (
              <span className="whitespace-nowrap text-base font-bold text-ink-900 sm:text-lg">{formatBDT(price)}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-1 sm:gap-1.5">
            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(book)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition sm:h-9 sm:w-9 ${
                  inWishlist
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-red-200 hover:text-red-500'
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${inWishlist ? 'fill-red-500' : ''}`} />
              </button>
            )}
            {onAddToCart && (
              <button
                onClick={() => onAddToCart(book)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-800 active:scale-95 sm:h-9 sm:w-9"
                aria-label="Add to cart"
              >
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
