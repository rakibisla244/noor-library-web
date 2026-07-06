import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Heart,
  ShoppingCart,
  Share2,
  Download,
  FileText,
  Calendar,
  Building2,
  Globe,
  Layers,
  Star,
  Shield,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { drainAdminEmailQueue } from '../lib/supabase';
import type { Book, Review } from '../lib/types';
import { formatBDT, discountPercent, effectivePrice, formatDate } from '../lib/types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import Rating from '../components/ui/Rating';
import Modal from '../components/ui/Modal';
import BookCard from '../components/BookCard';
import EmptyState from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import BookPreviewModal from '../components/BookPreviewModal';
import MobilePdfPreview from '../components/MobilePdfPreview';

export default function BookDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [related, setRelated] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { addBook } = useCart();
  const { toggle, has } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      const b = data as Book | null;
      setBook(b);
      if (b) {
        const [rel, revs] = await Promise.all([
          supabase.from('books').select('*, category:categories(*)').eq('category_id', b.category_id).neq('id', b.id).eq('status', 'published').limit(4),
          supabase.from('reviews').select('*, book:books(title)').eq('book_id', b.id).eq('status', 'approved').order('created_at', { ascending: false }),
        ]);
        setRelated((rel.data as Book[]) || []);
        // Fetch user profiles separately for reviews
        const reviewsData = (revs.data as Review[]) || [];
        if (reviewsData.length > 0) {
          const userIds = [...new Set(reviewsData.map(r => r.user_id))];
          const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
          const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
          const reviewsWithUsers = reviewsData.map(r => ({
            ...r,
            user: profileMap.get(r.user_id) || { full_name: 'Anonymous', avatar_url: null }
          }));
          setReviews(reviewsWithUsers);
        } else {
          setReviews([]);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const onAddToCart = () => {
    if (!book) return;
    if (!requireAuth()) return;
    addBook(book);
    toast(`${book.title} added to cart`, 'success');
  };

  const onBuyNow = () => {
    if (!book) return;
    if (!requireAuth()) return;
    addBook(book, 1, false); // Add to cart without opening drawer
    navigate('/checkout');
  };

  const onToggleWishlist = async () => {
    if (!book) return;
    if (!user) {
      toast('Please sign in to use wishlist', 'info');
      navigate('/login');
      return;
    }
    await toggle(book);
    toast(has(book.id) ? 'Removed from wishlist' : 'Added to wishlist', 'success');
  };

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: book?.title, url: window.location.href });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard', 'success');
    }
  };

  const submitReview = async () => {
    if (!user || !book) return;
    if (!newComment.trim()) {
      toast('Please write a comment', 'error');
      return;
    }
    setSubmitting(true);
    // Upsert: one review per user per book (unique constraint handles duplicates)
    const { error } = await supabase.from('reviews').upsert(
      {
        book_id: book.id,
        user_id: user.id,
        rating: newRating,
        comment: newComment,
        status: 'approved',
      },
      { onConflict: 'user_id,book_id' }
    );
    if (error) {
      toast(error.message, 'error');
    } else {
      drainAdminEmailQueue();
      toast('Review saved successfully!', 'success');
      setReviewModal(false);
      setNewComment('');
      setNewRating(5);
      // Refresh reviews + book rating
      const [revs, bookRefresh] = await Promise.all([
        supabase.from('reviews').select('*, book:books(title)').eq('book_id', book.id).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('books').select('rating, review_count').eq('id', book.id).maybeSingle(),
      ]);
      const reviewsData = (revs.data as Review[]) || [];
      if (reviewsData.length > 0) {
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
        setReviews(reviewsData.map(r => ({
          ...r,
          user: profileMap.get(r.user_id) || { full_name: 'Anonymous', avatar_url: null }
        })));
      } else {
        setReviews([]);
      }
      if (bookRefresh.data) {
        setBook(prev => prev ? { ...prev, rating: bookRefresh.data.rating, review_count: bookRefresh.data.review_count } : prev);
      }
    }
    setSubmitting(false);
  };

  if (loading) return <FullPageSpinner />;
  if (!book) {
    return (
      <div className="container-page py-20">
        <EmptyState icon={FileText} title="Book not found" description="The book you are looking for does not exist or has been removed." action={<Link to="/shop" className="btn-primary">Browse Books</Link>} />
      </div>
    );
  }

  const discount = discountPercent(book.price ?? 0, book.discount_price);
  const price = effectivePrice(book);

  return (
    <div>
      {/* Sticky Back bar */}
      <div className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="container-page flex items-center justify-between py-2.5">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/shop'))}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </button>
          <nav className="hidden items-center gap-1.5 text-xs text-ink-500 sm:flex">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/shop" className="hover:text-emerald-700">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            {book.category && book.category.slug && (
              <>
                <Link to={`/category/${book.category.slug}`} className="hover:text-emerald-700">{book.category.name}</Link>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <span className="max-w-[180px] truncate text-ink-700">{book.title}</span>
          </nav>
        </div>
      </div>

      {/* Breadcrumb (mobile) */}
      <div className="border-b border-ink-100 bg-ink-50/50 sm:hidden">
        <div className="container-page py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/shop" className="hover:text-emerald-700">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[140px] truncate text-ink-700">{book.title}</span>
          </nav>
        </div>
      </div>

      {/* Mobile PDF Preview - shown only on mobile, inline at top */}
      {book.preview_url && mobilePreviewOpen && (
        <section className="sm:hidden pt-4 px-4">
          <MobilePdfPreview
            url={book.preview_url}
            bookTitle={book.title}
            onClose={() => setMobilePreviewOpen(false)}
          />
        </section>
      )}

      {/* Mobile Preview Button - shown when preview closed */}
      {book.preview_url && !mobilePreviewOpen && (
        <div className="container-page sm:hidden pt-3">
          <button
            onClick={() => setMobilePreviewOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <BookOpen className="h-5 w-5" /> Read Free Preview
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="py-6 sm:py-10 lg:py-14">
        <div className="container-page grid gap-6 sm:gap-10 lg:grid-cols-[340px_1fr]">
          {/* Cover */}
          <div className="mx-auto w-full max-w-[240px] sm:max-w-sm lg:mx-0">
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              <img src={book.cover_url || '/placeholder-book.jpg'} alt={book.title || 'Book'} className="aspect-[3/4] w-full object-cover" />
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-md sm:left-4 sm:top-4 sm:text-sm">
                  -{discount}% OFF
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
              <button
                onClick={() => setPreviewOpen(true)}
                className="btn-outline py-2 text-xs sm:py-2.5 sm:text-sm hidden sm:flex"
              >
                <BookOpen className="h-4 w-4" /> Preview
              </button>
              <button
                onClick={() => {
                  if (window.innerWidth < 640) {
                    setMobilePreviewOpen(true);
                  } else {
                    setPreviewOpen(true);
                  }
                }}
                className="btn-outline py-2 text-xs sm:py-2.5 sm:text-sm flex sm:hidden"
              >
                <BookOpen className="h-4 w-4" /> Preview
              </button>
              <button onClick={onShare} className="btn-outline py-2 text-xs sm:py-2.5 sm:text-sm">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {book.category && book.category.slug && (
                <Link to={`/category/${book.category.slug}`} className="badge bg-emerald-100 text-emerald-700">
                  {book.category.name}
                </Link>
              )}
              <span className="badge bg-ink-100 text-ink-700">{book.language}</span>
              {book.is_bestseller && <span className="badge bg-gold-100 text-gold-800">Bestseller</span>}
              {book.is_new_arrival && <span className="badge bg-teal-100 text-teal-700">New Arrival</span>}
            </div>

            <h1 className="mt-3 text-2xl font-bold leading-tight text-ink-900 sm:mt-4 sm:text-3xl lg:text-4xl">{book.title}</h1>
            <p className="mt-1.5 text-base text-ink-600 sm:mt-2 sm:text-lg">by <span className="font-semibold text-emerald-700">{book.author}</span></p>

            <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-4 sm:gap-4">
              <Rating value={book.rating} count={book.review_count} size="lg" />
              <span className="text-xs text-ink-500 sm:text-sm">{book.sales_count} downloads</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-700 sm:mt-5">{book.description}</p>

            {/* Price */}
            <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/50 p-4 sm:mt-6 sm:p-5">
              <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                <span className="text-2xl font-extrabold text-emerald-700 sm:text-3xl lg:text-4xl">{formatBDT(price)}</span>
                {discount > 0 && (
                  <span className="text-lg text-ink-400 line-through sm:text-xl">{formatBDT(book.price ?? 0)}</span>
                )}
                {discount > 0 && book.discount_price != null && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    Save {formatBDT(book.price - book.discount_price)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-500">Inclusive of all taxes. Instant download after payment.</p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button onClick={onBuyNow} className="btn-primary flex-1 py-3 text-base">
                  <Download className="h-5 w-5" /> Buy Now
                </button>
                <button onClick={onAddToCart} className="btn-outline flex-1 py-3 text-base">
                  <ShoppingCart className="h-5 w-5" /> Add to Cart
                </button>
                <button
                  onClick={onToggleWishlist}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                    has(book.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-ink-200 text-ink-600 hover:border-red-200 hover:text-red-500'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`h-5 w-5 ${has(book.id) ? 'fill-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Shield, title: 'Secure Payment', desc: 'bKash, Nagad, Rocket' },
                { icon: Download, title: 'Instant Download', desc: 'Access after payment verification' },
                { icon: CheckCircle2, title: 'Lifetime Access', desc: 'Re-download anytime from dashboard' },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-2.5 rounded-xl border border-ink-100 p-3">
                  <b.icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{b.title}</p>
                    <p className="text-xs text-ink-500">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Details + Reviews */}
      <section className="border-t border-ink-100 bg-ink-50/30 py-12">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Description + Reviews */}
          <div>
            <h2 className="text-2xl font-bold text-ink-900">About this Book</h2>
            <p className="mt-4 leading-relaxed text-ink-700 whitespace-pre-line">{book.description}</p>

            <div className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-ink-900">Reviews ({reviews.length})</h2>
                {user && (
                  <button
                    onClick={async () => {
                      // Pre-fill with existing review if user has one
                      const { data: existing } = await supabase
                        .from('reviews')
                        .select('rating, comment')
                        .eq('book_id', book.id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                      if (existing) {
                        setNewRating(existing.rating);
                        setNewComment(existing.comment);
                      } else {
                        setNewRating(5);
                        setNewComment('');
                      }
                      setReviewModal(true);
                    }}
                    className="btn-outline py-2"
                  >
                    {reviews.some(r => r.user_id === user.id) ? 'Edit Your Review' : 'Write a Review'}
                  </button>
                )}
              </div>

              {reviews.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-ink-200 p-10 text-center">
                  <Star className="mx-auto h-10 w-10 text-ink-300" />
                  <p className="mt-3 font-semibold text-ink-700">No reviews yet</p>
                  <p className="mt-1 text-sm text-ink-500">Be the first to share your thoughts on this book.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="card p-5">
                      <div className="flex items-start gap-3">
                        {r.user?.avatar_url ? (
                          <img
                            src={r.user.avatar_url}
                            alt="Avatar"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                            {(r.user?.full_name || 'A').charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-ink-900">{r.user?.full_name || 'Anonymous'}</p>
                            <span className="text-xs text-ink-400">{formatDate(r.created_at)}</span>
                          </div>
                          <Rating value={r.rating} showCount={false} size="sm" />
                          <p className="mt-2 text-sm text-ink-700">{r.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: book details — shown first on mobile, last on desktop */}
          <aside className="order-first lg:order-last">
            <div className="card p-6 lg:sticky lg:top-28">
              <h3 className="text-lg font-bold text-ink-900">Book Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  { icon: Building2, label: 'Publisher', value: book.publisher || 'N/A' },
                  { icon: Calendar, label: 'Published', value: formatDate(book.publication_date) },
                  { icon: Layers, label: 'Pages', value: String(book.pages || 0) },
                  { icon: FileText, label: 'File Size', value: book.file_size || 'N/A' },
                  { icon: Globe, label: 'Language', value: book.language || 'N/A' },
                  { icon: Star, label: 'Rating', value: `${(book.rating || 0).toFixed(1)} / 5` },
                ].map((d) => (
                  <div key={d.label} className="flex items-center justify-between border-b border-ink-100 pb-2">
                    <span className="flex items-center gap-2 text-ink-500">
                      <d.icon className="h-4 w-4" /> {d.label}
                    </span>
                    <span className="font-semibold text-ink-900">{d.value}</span>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-12">
          <div className="container-page">
            <h2 className="text-2xl font-bold text-ink-900">You May Also Like</h2>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((b) => (
                <BookCard
                  key={b.id}
                  book={b}
                  onAddToCart={(book) => { if (!requireAuth()) return; add(book); toast('Added to cart', 'success'); }}
                  onToggleWishlist={async (book) => { await toggle(book); toast(has(book.id) ? 'Removed' : 'Added', 'success'); }}
                  inWishlist={has(b.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Preview modal - in-page PDF reader with book info sidebar */}
      <BookPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        book={book}
        onBuyNow={onBuyNow}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
        inWishlist={has(book.id)}
      />

      {/* Review modal */}
      <Modal open={reviewModal} onClose={() => setReviewModal(false)} title={reviews.some(r => r.user_id === user?.id) ? 'Edit Your Review' : 'Write a Review'}>
        <div className="space-y-4">
          <div>
            <label className="label">Your Rating</label>
            <Rating value={newRating} interactive showCount={false} size="lg" onChange={setNewRating} />
          </div>
          <div>
            <label className="label">Your Review</label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={5}
              placeholder="Share your thoughts about this book..."
              className="input resize-none"
            />
          </div>
          <button onClick={submitReview} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Saving...' : 'Submit Review'}
          </button>
          <p className="text-center text-xs text-ink-500">Your review is published immediately. You can update it anytime.</p>
        </div>
      </Modal>
    </div>
  );
}
