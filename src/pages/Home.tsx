import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Shield,
  Download,
  Clock,
  Star,
  ArrowRight,
  Quote,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Users,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Book, Category, BlogPost } from '../lib/types';
import BookCard from '../components/BookCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import HeroBackground from '../components/HeroBackground';


interface Review {
  id: string;
  rating: number;
  comment: string;
  user: { full_name: string; avatar_url?: string | null };
  book: { title: string };
}

export default function Home() {
  const [featured, setFeatured] = useState<Book[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [bestsellers, setBestsellers] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packageCount, setPackageCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ebooks: { value: '500+', label: 'eBooks Available' },
    readers: { value: '10K+', label: 'Happy Readers' },
    downloads: { value: '50K+', label: 'Downloads' },
    rating: { value: '4.8', label: 'Avg. Rating' },
  });

  const { addBook } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    (async () => {
      const [feat, newArr, best, cats, pkgCount, revs, blog, statsData] = await Promise.all([
        supabase.from('books').select('*, category:categories(*)').eq('is_featured', true).eq('status', 'published').order('rating', { ascending: false }).limit(8),
        supabase.from('books').select('*, category:categories(*)').eq('is_new_arrival', true).eq('status', 'published').order('created_at', { ascending: false }).limit(8),
        supabase.from('books').select('*, category:categories(*)').eq('is_bestseller', true).eq('status', 'published').order('sales_count', { ascending: false }).limit(8),
        supabase.from('categories').select('*').order('name'),
        supabase.from('book_packages').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('reviews').select('id, rating, comment, user_id, book:books(title)').eq('status', 'approved').order('rating', { ascending: false }).limit(6),
        supabase.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(3),
        supabase.from('settings').select('key, value').in('key', ['stat_ebooks_value', 'stat_ebooks_label', 'stat_readers_value', 'stat_readers_label', 'stat_downloads_value', 'stat_downloads_label', 'stat_rating_value', 'stat_rating_label']),
      ]);
      setFeatured(feat.data as Book[] || []);
      setNewArrivals(newArr.data as Book[] || []);
      setBestsellers(best.data as Book[] || []);
      setCategories(cats.data as Category[] || []);
      setPackageCount(pkgCount.count || 0);
      // Fetch user profiles separately for reviews
      const reviewsData = (revs.data as (Review & { user_id: string })[]) || [];
      if (reviewsData.length > 0) {
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
        const reviewsWithUsers = reviewsData.map(r => ({
          ...r,
          user: profileMap.get(r.user_id) || { full_name: 'Anonymous', avatar_url: null }
        }));
        setReviews(reviewsWithUsers as unknown as Review[]);
      } else {
        setReviews([]);
      }
      setBlogPosts(blog.data as BlogPost[] || []);
      // Process stats from settings
      const statsMap: Record<string, string> = {};
      (statsData.data || []).forEach((s: { key: string; value: string }) => {
        statsMap[s.key] = s.value || '';
      });
      setStats({
        ebooks: { value: statsMap.stat_ebooks_value || '500+', label: statsMap.stat_ebooks_label || 'eBooks Available' },
        readers: { value: statsMap.stat_readers_value || '10K+', label: statsMap.stat_readers_label || 'Happy Readers' },
        downloads: { value: statsMap.stat_downloads_value || '50K+', label: statsMap.stat_downloads_label || 'Downloads' },
        rating: { value: statsMap.stat_rating_value || '4.8', label: statsMap.stat_rating_label || 'Avg. Rating' },
      });
      setLoading(false);
    })();
  }, []);

  const onAddToCart = (book: Book) => {
    if (!requireAuth()) return;
    addBook(book);
    toast(`${book.title} added to cart`, 'success');
  };

  const onToggleWishlist = async (book: Book) => {
    await toggle(book);
    toast(has(book.id) ? 'Removed from wishlist' : 'Added to wishlist', 'success');
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800">
        <HeroBackground />

        <div className="container-page relative grid items-center gap-8 py-10 lg:gap-12 lg:grid-cols-2 lg:py-24">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
              <Sparkles className="h-3.5 w-3.5" /> Authentic Islamic eBooks
            </span>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Authentic Islamic Knowledge,{' '}
              <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
                Delivered Instantly
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-emerald-100 lg:mx-0">
              Discover a curated collection of authentic Islamic eBooks. Pay with bKash, Nagad, Rocket, or SSLCommerz and download instantly.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link to="/shop" className="btn-gold">
                Browse Books <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/categories" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
                Explore Categories
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-emerald-100 lg:justify-start">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-gold-400" /> 500+ eBooks
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-gold-400" /> Instant Download
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-gold-400" /> Secure Payments
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
              {featured.slice(0, 4).map((book, i) => (
                <div
                  key={book.id}
                  className={`overflow-hidden rounded-xl shadow-2xl transition-transform duration-500 hover:scale-105 ${
                    i % 2 === 0 ? 'translate-y-6' : ''
                  }`}
                >
                  <Link to={`/book/${book.slug}`}>
                    <img src={book.cover_url} alt={book.title} className="aspect-[3/4] w-full object-cover" />
                  </Link>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-xl">
              Trusted by 10,000+ readers
            </div>
          </div>
        </div>

      </section>

      {/* Stats bar */}
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            { icon: BookOpen, ...stats.ebooks },
            { icon: Users, ...stats.readers },
            { icon: Download, ...stats.downloads },
            { icon: Star, ...stats.rating },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900">{s.value}</p>
                <p className="text-xs text-ink-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 lg:py-16">
        <div className="container-page">
          <div className="mb-6 flex items-end justify-between lg:mb-10">
            <div>
              <span className="heading-eyebrow">Browse by</span>
              <h2 className="mt-2 text-3xl font-bold text-ink-900">Categories</h2>
              <p className="mt-2 text-ink-500">Explore books across the major Islamic disciplines.</p>
            </div>
            <Link to="/categories" className="hidden text-sm font-semibold text-emerald-700 hover:text-emerald-800 sm:flex sm:items-center sm:gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {/* Packages Category Card - First position */}
            <Link
              to="/packages"
              className="group relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-gold-50 p-6 transition-all hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-ink-900 group-hover:text-emerald-700">Book Packages & Bundles</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">Special collections of multiple Islamic eBooks at discounted prices.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
                  Explore
                </span>
                <ArrowRight className="h-3 w-3 text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {packageCount > 0 && (
                <div className="mt-3 flex items-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm whitespace-nowrap">
                    <Package className="h-3 w-3" />
                    {packageCount} Package{packageCount !== 1 ? 's' : ''} Available
                  </span>
                </div>
              )}
            </Link>

            {/* Premium green gradient variations for category cards */}
            {categories.slice(0, 7).map((cat, index) => {
              // Different gradient styles for variety
              const gradientStyles = [
                'from-emerald-50 via-emerald-50 to-teal-50 border-teal-200/80 hover:border-teal-400',
                'from-emerald-50 via-green-50 to-emerald-100 border-green-200/80 hover:border-green-400',
                'from-emerald-50 via-emerald-100 to-emerald-50 border-emerald-300/70 hover:border-emerald-500',
                'from-teal-50 via-emerald-50 to-emerald-50 border-emerald-200/80 hover:border-emerald-400',
                'from-emerald-50 via-amber-50/30 to-emerald-50 border-amber-200/60 hover:border-amber-400',
                'from-emerald-50 via-slate-50 to-emerald-50 border-slate-200/80 hover:border-slate-400',
                'from-emerald-50 via-cyan-50/50 to-emerald-100 border-cyan-200/70 hover:border-cyan-400',
              ];
              const gradientStyle = gradientStyles[index % gradientStyles.length];

              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${gradientStyle} p-6 transition-all hover:-translate-y-1 hover:shadow-lg`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ background: cat.color ? `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)` : 'linear-gradient(135deg, #047857, #059669)' }}
                  >
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-bold text-ink-900 group-hover:text-emerald-700">{cat.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{cat.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
                    Explore <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-ink-50/50 py-10 lg:py-16">
        <div className="container-page">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="heading-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Handpicked</span>
              <h2 className="mt-2 text-3xl font-bold text-ink-900">Featured Islamic Books</h2>
              <p className="mt-2 text-ink-500">Top-rated titles selected by our editorial team.</p>
            </div>
            <Link to="/shop" className="hidden text-sm font-semibold text-emerald-700 hover:text-emerald-800 sm:flex sm:items-center sm:gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  inWishlist={has(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-10 lg:py-16">
        <div className="container-page">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="heading-eyebrow">Just Added</span>
              <h2 className="mt-2 text-3xl font-bold text-ink-900">New Arrivals</h2>
              <p className="mt-2 text-ink-500">The latest additions to our collection.</p>
            </div>
            <Link to="/shop?filter=new" className="hidden text-sm font-semibold text-emerald-700 hover:text-emerald-800 sm:flex sm:items-center sm:gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {newArrivals.slice(0, 4).map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  inWishlist={has(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-emerald-950 py-10 text-white lg:py-16">
        <div className="container-page">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
              <Shield className="h-3.5 w-3.5" /> Why Noor Library
            </span>
            <h2 className="mt-3 text-3xl font-bold text-white">A marketplace you can trust</h2>
            <p className="mt-3 text-emerald-100">Built for Muslims who value authentic knowledge, secure payments, and instant access.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'Secure Payments', desc: 'Pay safely with bKash, Nagad, Rocket, or SSLCommerz. Your data is encrypted.' },
              { icon: Download, title: 'Instant Download', desc: 'Get your eBooks immediately after payment. No waiting, no shipping.' },
              { icon: BookOpen, title: 'Authentic Content', desc: 'Every book is reviewed for authenticity before being listed.' },
              { icon: Clock, title: 'Lifetime Access', desc: 'Your purchased books are always available in your dashboard.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/20 text-gold-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-emerald-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-10 lg:py-16">
        <div className="container-page">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="heading-eyebrow"><TrendingUp className="h-3.5 w-3.5" /> Most Loved</span>
              <h2 className="mt-2 text-3xl font-bold text-ink-900">Best Sellers</h2>
              <p className="mt-2 text-ink-500">Our most-downloaded Islamic eBooks.</p>
            </div>
            <Link to="/shop?filter=bestseller" className="hidden text-sm font-semibold text-emerald-700 hover:text-emerald-800 sm:flex sm:items-center sm:gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {bestsellers.slice(0, 4).map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  inWishlist={has(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="bg-ink-50/50 py-10 lg:py-16">
          <div className="container-page">
            <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-12">
              <span className="heading-eyebrow justify-center"><Quote className="h-3.5 w-3.5" /> Testimonials</span>
              <h2 className="mt-3 text-3xl font-bold text-ink-900">What our readers say</h2>
              <p className="mt-3 text-ink-500">Real reviews from Muslims who trust Noor Library.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <div key={r.id} className="card p-6">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-gold-400 text-gold-400' : 'fill-ink-200 text-ink-200'}`} />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-ink-700">"{r.comment || 'Excellent book, highly recommended for any Muslim seeking knowledge.'}"</p>
                  <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
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
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{r.user?.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-ink-500">on {r.book?.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog preview */}
      {blogPosts.length > 0 && (
        <section className="py-10 lg:py-16">
          <div className="container-page">
            <div className="mb-6 flex items-end justify-between lg:mb-10">
              <div>
                <span className="heading-eyebrow">From the Blog</span>
                <h2 className="mt-2 text-3xl font-bold text-ink-900">Islamic Articles & Guides</h2>
              </div>
              <Link to="/blog" className="hidden text-sm font-semibold text-emerald-700 hover:text-emerald-800 sm:flex sm:items-center sm:gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {blogPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-glow">
                  <div className="aspect-[16/10] overflow-hidden bg-ink-100">
                    <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <span className="badge bg-emerald-100 text-emerald-700">{post.category}</span>
                    <h3 className="mt-3 line-clamp-2 font-bold text-ink-900 group-hover:text-emerald-700">{post.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-500">{post.excerpt}</p>
                    <p className="mt-3 text-xs text-ink-400">{post.author} • {new Date(post.published_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
