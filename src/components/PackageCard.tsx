import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Package, BookOpen, Star } from 'lucide-react';
import type { BookPackage } from '../lib/types';
import { formatBDT, packageOriginalPrice, packageSavingsPercent } from '../lib/types';

interface PackageCardProps {
  pkg: BookPackage & { book_count?: number };
  onAddToCart?: (pkg: BookPackage) => void;
  onToggleWishlist?: (pkg: BookPackage) => void;
  inWishlist?: boolean;
}

export default function PackageCard({ pkg, onAddToCart, onToggleWishlist, inWishlist }: PackageCardProps) {
  const originalPrice = packageOriginalPrice(pkg);
  const savingsPercent = packageSavingsPercent(pkg);
  const bookCount = pkg.book_count ?? (pkg.books?.length ?? 0);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
      <Link to={`/package/${pkg.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-ink-100">
        {pkg.cover_url ? (
          <img
            src={pkg.cover_url}
            alt={pkg.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
            <Package className="h-12 w-12 text-emerald-600 sm:h-16 sm:w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Package badge (top-left) */}
        <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-md sm:left-3 sm:top-3 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-xs">
          <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          Package
        </span>

        {/* Savings badge (top-right) */}
        {savingsPercent > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-md sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
            -{savingsPercent}%
          </span>
        )}

        {/* Bestseller badge - at top-right when no savings, below savings otherwise */}
        {pkg.is_bestseller && (
          <span className={`absolute right-2 top-2 rounded-full bg-gold-400 px-2 py-1 text-[10px] font-bold text-ink-900 shadow-md sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${
            savingsPercent > 0 ? '!top-9 sm:!top-12' : ''
          }`}>
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
          <span className="text-[10px] font-semibold text-ink-700 sm:text-xs">{(pkg.rating || 0).toFixed(1)}</span>
          <span className="text-[10px] text-ink-400 sm:text-xs">• {pkg.language || 'Bangla'}</span>
        </div>
        <Link to={`/package/${pkg.slug}`}>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-900 transition-colors hover:text-emerald-700 sm:text-base">
            {pkg.name}
          </h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500 sm:mt-1 sm:text-sm">
          {bookCount} {bookCount === 1 ? 'book' : 'books'} included
        </p>
        {pkg.author && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-400 sm:text-xs">by {pkg.author}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2 sm:pt-3">
          <div className="min-w-0 flex-1">
            {originalPrice > pkg.price ? (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:flex-nowrap sm:gap-2">
                <span className="whitespace-nowrap text-base font-bold text-emerald-700 sm:text-lg">{formatBDT(pkg.price)}</span>
                <span className="whitespace-nowrap text-xs text-ink-400 line-through sm:text-sm">{formatBDT(originalPrice)}</span>
              </div>
            ) : (
              <span className="whitespace-nowrap text-base font-bold text-ink-900 sm:text-lg">{formatBDT(pkg.price)}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-1 sm:gap-1.5">
            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(pkg)}
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
                onClick={() => onAddToCart(pkg)}
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
