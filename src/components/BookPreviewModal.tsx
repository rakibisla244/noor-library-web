import { useEffect, useState } from 'react';
import { X, ArrowLeft, Heart, ShoppingCart, Download, BookOpen, AlertCircle } from 'lucide-react';
import type { Book } from '../lib/types';
import { formatBDT, discountPercent, effectivePrice } from '../lib/types';
import PdfViewer from './ui/PdfViewer';

interface BookPreviewModalProps {
  open: boolean;
  onClose: () => void;
  book: Book | null;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  inWishlist: boolean;
}

export default function BookPreviewModal({
  open,
  onClose,
  book,
  onBuyNow,
  onAddToCart,
  onToggleWishlist,
  inWishlist,
}: BookPreviewModalProps) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 10);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !book) return null;

  const discount = discountPercent(book.price ?? 0, book.discount_price);
  const price = effectivePrice(book);
  const hasPreview = !!book.preview_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-ink-900/70 backdrop-blur-sm transition-opacity duration-300 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          animateIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Shop</span>
            </button>
            <div className="hidden items-center gap-2 text-ink-900 sm:flex">
              <span className="text-ink-200">|</span>
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold sm:text-lg">Reading Preview</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* LEFT: PDF Viewer (70%) */}
          <div className="flex-1 overflow-hidden border-b border-ink-100 lg:border-b-0 lg:border-r">
            {hasPreview ? (
              <PdfViewer url={book.preview_url!} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center bg-ink-50 p-8 text-center">
                <div>
                  <AlertCircle className="mx-auto h-12 w-12 text-ink-300" />
                  <p className="mt-4 text-base font-semibold text-ink-700">
                    Preview not available
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    This book doesn't have a preview file. Please purchase to read the full book.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Book info (30%) */}
          <div className="flex w-full flex-col overflow-y-auto bg-white lg:w-[320px] lg:max-w-[360px] scrollbar-thin">
            <div className="p-4 sm:p-5 lg:p-6">
              {/* Cover - smaller on mobile */}
              <div className="mx-auto w-28 overflow-hidden rounded-xl shadow-card sm:w-36 lg:w-40">
                <img
                  src={book.cover_url || '/placeholder-book.jpg'}
                  alt={book.title || 'Book'}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>

              {/* Title & Author */}
              <h2 className="mt-4 text-lg font-bold leading-tight text-ink-900 sm:mt-5 sm:text-xl">
                {book.title}
              </h2>
              <p className="mt-1 text-xs text-ink-600 sm:mt-1.5 sm:text-sm">
                by <span className="font-semibold text-emerald-700">{book.author}</span>
              </p>

              {/* Meta */}
              <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
                {book.category && book.category.name && (
                  <span className="badge bg-emerald-100 text-emerald-700">
                    {book.category.name}
                  </span>
                )}
                <span className="badge bg-ink-100 text-ink-700">{book.language}</span>
                {book.is_bestseller && (
                  <span className="badge bg-gold-100 text-gold-800">Bestseller</span>
                )}
              </div>

              {/* Price */}
              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-3 sm:mt-5 sm:p-4">
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <span className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                    {formatBDT(price)}
                  </span>
                  {discount > 0 && (
                    <span className="text-sm text-ink-400 line-through sm:text-base">
                      {formatBDT(book.price ?? 0)}
                    </span>
                  )}
                </div>
                {discount > 0 && book.discount_price != null && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    Save {formatBDT(book.price - book.discount_price)} ({discount}% off)
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">
                  Instant download after payment.
                </p>
              </div>

              {/* Short description */}
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-600 sm:mt-4 sm:line-clamp-4 sm:text-sm">
                {book.description}
              </p>

              {/* Action buttons */}
              <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5">
                <button
                  onClick={onBuyNow}
                  className="btn-primary w-full py-2.5 text-sm sm:py-3 sm:text-base"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" /> Buy Now
                </button>
                <button
                  onClick={onAddToCart}
                  className="btn-outline w-full py-2.5 text-sm sm:py-3 sm:text-base"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" /> Add to Cart
                </button>
                <button
                  onClick={onToggleWishlist}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition sm:gap-2 sm:py-3 sm:text-sm ${
                    inWishlist
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-ink-200 text-ink-700 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${inWishlist ? 'fill-red-500' : ''}`} />
                  {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
