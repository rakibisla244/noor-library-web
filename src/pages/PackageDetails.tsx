import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Heart,
  ShoppingCart,
  Share2,
  Package,
  BookOpen,
  CheckCircle2,
  Tag,
  Clock,
  Globe,
  Layers,
  Calendar,
  Star,
  Download,
  Play,
  X,
  ChevronUp,
  ChevronDown,
  Shield,
  FileText,
  Bookmark,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BookPackage, Book, Category, PackageGalleryImage, PackagePreview } from '../lib/types';
import {
  formatBDT,
  packageOriginalPrice,
  packageSavings,
  packageSavingsPercent,
  formatDate,
  discountPercent,
  effectivePrice,
} from '../lib/types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import EmptyState from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import PdfViewer from '../components/ui/PdfViewer';

type LoadState = 'loading' | 'not-found' | 'error' | 'ready';

export default function PackageDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<BookPackage | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [previewPdfs, setPreviewPdfs] = useState<PackagePreview[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<PackagePreview | null>(null);
  const [status, setStatus] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const { addPackage, hasItem } = useCart();
  const { toggle: toggleWishlist, has: hasWishlist } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  const loadData = useCallback(async () => {
    // Missing slug → not found, never infinite loading
    if (!slug) {
      console.log('PackageDetails: no slug provided');
      setPkg(null);
      setStatus('not-found');
      return;
    }

    console.log('PackageDetails: Loading package:', slug);
    setStatus('loading');
    setErrorMsg('');

    try {
      // Fetch package
      console.log('PackageDetails: Fetching package data...');
      const { data: pkgData, error: pkgError } = await supabase
        .from('book_packages')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (pkgError) {
        console.error('PackageDetails: error loading package:', pkgError);
        setErrorMsg(pkgError.message);
        setStatus('error');
        return;
      }

      if (!pkgData) {
        console.log('PackageDetails: package not found for slug:', slug);
        setPkg(null);
        setStatus('not-found');
        return;
      }

      // Only show active packages to public users
      if (!pkgData.is_active) {
        console.log('PackageDetails: package is not active:', slug);
        setPkg(null);
        setStatus('not-found');
        return;
      }

      console.log('PackageDetails: Package found:', pkgData.name);
      const packageResult = pkgData as BookPackage;
      setPkg(packageResult);

      // Increment view count (fire-and-forget, never blocks)
      supabase.rpc('increment_package_view', { pkg_id: packageResult.id }).then(() => {}, () => {});

      // Fetch books in this package via package_items join
      console.log('PackageDetails: Fetching package books...');
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('package_items')
          .select('book_id, book:books(*, category:categories(*))')
          .eq('package_id', packageResult.id);

        if (itemsError) {
          console.error('PackageDetails: error loading package_items:', itemsError);
        }

        const items = (itemsData || []) as any[];
        const includedBooks = items
          .map((it) => it.book)
          .filter((b): b is Book => Boolean(b));
        console.log('PackageDetails: Found', includedBooks.length, 'books in package');
        setBooks(includedBooks);
      } catch (err) {
        console.error('PackageDetails: failed to load package books:', err);
        setBooks([]);
      }

      // Fetch gallery images
      console.log('PackageDetails: Fetching gallery images...');
      try {
        const { data: galleryData, error: galleryError } = await supabase
          .from('package_gallery_images')
          .select('image_url, display_order')
          .eq('package_id', packageResult.id)
          .order('display_order');

        if (galleryError) {
          console.error('PackageDetails: error loading gallery:', galleryError);
        }

        const images = (galleryData || []).map((g) => g.image_url);
        if (packageResult.cover_url) {
          images.unshift(packageResult.cover_url);
        }
        console.log('PackageDetails: Found', images.length, 'gallery images');
        setGalleryImages(images);
      } catch (err) {
        console.error('PackageDetails: failed to load gallery:', err);
        setGalleryImages(packageResult.cover_url ? [packageResult.cover_url] : []);
      }

      // Fetch preview PDFs
      console.log('PackageDetails: Fetching preview PDFs...');
      try {
        const { data: previewData, error: previewError } = await supabase
          .from('package_previews')
          .select('id, title, file_url, file_size, display_order')
          .eq('package_id', packageResult.id)
          .order('display_order');

        if (previewError) {
          console.error('PackageDetails: error loading previews:', previewError);
        }

        console.log('PackageDetails: Found', (previewData || []).length, 'preview PDFs');
        setPreviewPdfs((previewData as PackagePreview[]) || []);
      } catch (err) {
        console.error('PackageDetails: failed to load previews:', err);
        setPreviewPdfs([]);
      }

      console.log('PackageDetails: Package loaded successfully, setting status to ready');
      setStatus('ready');
    } catch (err) {
      console.error('PackageDetails: unexpected error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load package');
      setStatus('error');
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onAddToCart = () => {
    if (!pkg) return;
    if (!requireAuth()) return;
    addPackage(pkg);
    toast(`${pkg.name} added to cart`, 'success');
  };

  const onBuyNow = () => {
    if (!pkg) return;
    if (!requireAuth()) return;
    addPackage(pkg, 1, false);
    navigate('/checkout');
  };

  const onToggleWishlist = async () => {
    if (!pkg) return;
    if (!user) {
      toast('Please sign in to add to wishlist', 'info');
      return;
    }
    toast('Package wishlist coming soon!', 'info');
  };

  const onShare = async () => {
    if (!pkg) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: pkg.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast('Link copied to clipboard', 'success');
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  const openImageModal = (image: string) => {
    setSelectedImage(image);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage || galleryImages.length === 0) return;
    const currentIndex = galleryImages.indexOf(selectedImage);
    if (direction === 'prev') {
      setSelectedImage(galleryImages[(currentIndex - 1 + galleryImages.length) % galleryImages.length]);
    } else {
      setSelectedImage(galleryImages[(currentIndex + 1) % galleryImages.length]);
    }
  };

  const isInCart = pkg ? hasItem(pkg.id, true) : false;

  if (status === 'loading') return <FullPageSpinner />;

  if (status === 'not-found' || !pkg) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={Package}
          title="Package Not Found"
          description="The package you are looking for does not exist, is no longer available, or the link is invalid."
          action={
            <div className="flex gap-2">
              <Link to="/shop" className="btn-primary">
                Browse All Books
              </Link>
              <Link to="/packages" className="btn-outline">
                View Packages
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load package"
          description={errorMsg || 'Something went wrong while loading this package. Please try again.'}
          action={
            <div className="flex gap-2">
              <button onClick={loadData} className="btn-primary">
                Try Again
              </button>
              <Link to="/shop" className="btn-outline">
                Back to Shop
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const originalPrice = packageOriginalPrice({ ...pkg, books });
  const savings = packageSavings({ ...pkg, books });
  const savingsPercent = packageSavingsPercent({ ...pkg, books });
  const totalPages = books.reduce((sum, b) => sum + (b.pages || 0), 0);

  return (
    <div className="container-page py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-ink-500">
        <Link to="/" className="hover:text-emerald-700">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/shop" className="hover:text-emerald-700">
          Shop
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-ink-900">{pkg.name}</span>
      </nav>

      <div className="mb-8">
        <Link to="/shop" className="btn-outline inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images Section */}
        <div className="space-y-4">
          {/* Main Image */}
          <div
            className="overflow-hidden rounded-2xl border border-ink-200 bg-white cursor-zoom-in"
            onClick={() => galleryImages[0] && openImageModal(galleryImages[0])}
          >
            {pkg.cover_url ? (
              <img
                src={pkg.cover_url}
                alt={pkg.name}
                className="aspect-[3/4] w-full object-cover transition-transform hover:scale-105"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                <Package className="h-24 w-24 text-emerald-600" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {galleryImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => openImageModal(img)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    img === pkg.cover_url ? 'border-emerald-600' : 'border-ink-200 hover:border-emerald-400'
                  }`}
                >
                  <img src={img} alt={`${pkg.name} ${index + 1}`} className="h-16 w-14 object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Package Badge */}
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-emerald-700">
            <Package className="h-5 w-5" />
            <span className="font-semibold">Special Package Bundle</span>
          </div>
        </div>

        {/* Package Info */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
              <Package className="h-4 w-4" />
              Package
            </span>
            {pkg.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                <Star className="h-4 w-4" />
                Featured
              </span>
            )}
            {pkg.is_bestseller && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-700">
                <Tag className="h-4 w-4" />
                Bestseller
              </span>
            )}
            {savingsPercent > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                Save {savingsPercent}%
              </span>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-ink-900">{pkg.name}</h1>
            {pkg.author && (
              <p className="mt-1 text-lg text-ink-500">by {pkg.author}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-600">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>{books.length} books</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>{totalPages || pkg.page_count || 0} pages</span>
            </div>
            {pkg.language && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>{pkg.language}</span>
              </div>
            )}
            {pkg.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{pkg.rating.toFixed(1)}</span>
                <span className="text-ink-400">({pkg.review_count})</span>
              </div>
            )}
            {pkg.category && (
              <Link
                to={`/category/${pkg.category.slug}`}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
              >
                <Tag className="h-4 w-4" />
                <span>{pkg.category.name}</span>
              </Link>
            )}
          </div>

          {/* Description */}
          {pkg.description && (
            <p className="text-ink-600 leading-relaxed">{pkg.description}</p>
          )}

          {/* Tags */}
          {pkg.tags && pkg.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pkg.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Features */}
          {pkg.features && pkg.features.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="mb-3 font-semibold text-emerald-800">This Package Includes:</h3>
              <ul className="space-y-2">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview PDFs */}
          {previewPdfs.length > 0 && (
            <div className="rounded-xl border border-ink-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-ink-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Preview Available
              </h3>
              <div className="space-y-2">
                {previewPdfs.map((preview) => (
                  <button
                    key={preview.id}
                    onClick={() => setSelectedPreview(preview)}
                    className="flex w-full items-center gap-3 rounded-lg border border-ink-100 bg-ink-50 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink-900">{preview.title}</p>
                      {preview.file_size && (
                        <p className="text-xs text-ink-500">{preview.file_size}</p>
                      )}
                    </div>
                    <Bookmark className="h-5 w-5 text-emerald-600" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Click to preview the books before purchasing
              </p>
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-emerald-700 sm:text-4xl">{formatBDT(pkg.price)}</span>
              {originalPrice > pkg.price && (
                <>
                  <span className="text-xl text-ink-400 line-through">{formatBDT(originalPrice)}</span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
                    Save {savingsPercent}%
                  </span>
                </>
              )}
            </div>
            {savings > 0 && (
              <p className="mt-2 text-lg font-medium text-emerald-600">
                You save {formatBDT(savings)} with this package!
              </p>
            )}
            <p className="mt-1 text-sm text-ink-500">
              Get {books.length} books for one price
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
            <button
              onClick={onAddToCart}
              disabled={isInCart}
              className={`col-span-2 sm:col-span-1 flex-1 btn-primary ${isInCart ? 'opacity-70' : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {isInCart ? 'Added to Cart' : 'Add to Cart'}
            </button>
            <button onClick={onBuyNow} className="col-span-2 sm:col-span-1 flex-1 btn-outline">
              Buy Now
            </button>
            <button
              onClick={onToggleWishlist}
              className="btn-outline"
              title="Add to Wishlist"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              onClick={onShare}
              className="btn-outline"
              title="Share package"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-ink-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-ink-900">Instant Access</p>
                <p className="text-xs text-ink-500">Download immediately after payment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-ink-900">{books.length} Books</p>
                <p className="text-xs text-ink-500">Complete bundle collection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Tag className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-ink-900">Best Value</p>
                <p className="text-xs text-ink-500">Save {savingsPercent}% compared to individual</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-ink-900">Secure</p>
                <p className="text-xs text-ink-500">Safe and encrypted checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Included Books Section */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-ink-900">
          Books Included in This Package ({books.length})
        </h2>
        {books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books in this package"
            description="This package is currently empty. Please contact support if you believe this is an error."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => {
              const discount = discountPercent(book.price, book.discount_price);
              const price = effectivePrice(book);
              return (
                <div key={book.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                  <Link to={`/book/${book.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-ink-100">
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {discount > 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-md">
                        -{discount}%
                      </span>
                    )}
                  </Link>
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-600 p-1.5 text-white shadow-md">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-1 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />
                      <span className="text-xs font-semibold text-ink-700">{book.rating.toFixed(1)}</span>
                      <span className="text-xs text-ink-400">• {book.language}</span>
                    </div>
                    <Link to={`/book/${book.slug}`}>
                      <h3 className="line-clamp-2 font-bold leading-snug text-ink-900 transition-colors hover:text-emerald-700">
                        {book.title}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-500">{book.author}</p>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        {discount > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-700">{formatBDT(price)}</span>
                            <span className="text-sm text-ink-400 line-through">{formatBDT(book.price)}</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-ink-900">{formatBDT(price)}</span>
                        )}
                      </div>
                      <Link
                        to={`/book/${book.slug}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-800 active:scale-95"
                        aria-label="View details"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('prev');
            }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronUp className="h-6 w-6 rotate-[-90deg]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('next');
            }}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronDown className="h-6 w-6 rotate-[90deg]" />
          </button>
          <img
            src={selectedImage}
            alt={pkg.name}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Preview PDF Modal */}
      {selectedPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4"
          onClick={() => setSelectedPreview(null)}
        >
          <button
            onClick={() => setSelectedPreview(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-100 bg-white p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-ink-900">{selectedPreview.title}</span>
              </div>
              <a
                href={selectedPreview.file_url}
                target="_blank"
                rel="noreferrer"
                className="btn-outline py-1.5 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </a>
            </div>
            <div className="flex-1 overflow-hidden">
              <PdfViewer url={selectedPreview.file_url} className="h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
