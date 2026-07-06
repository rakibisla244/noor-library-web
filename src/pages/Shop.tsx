import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, BookOpen, ChevronRight, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Book, Category, BookPackage } from '../lib/types';
import BookCard from '../components/BookCard';
import PackageCard from '../components/PackageCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import EmptyState from '../components/ui/EmptyState';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating' | 'bestselling';

type DisplayItem =
  | { kind: 'book'; book: Book }
  | { kind: 'package'; pkg: BookPackage & { book_count: number } };

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [packages, setPackages] = useState<(BookPackage & { book_count: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filter = searchParams.get('filter') || 'all';
  const categorySlug = searchParams.get('category') || 'all';
  const author = searchParams.get('author') || '';
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || 5000);
  const language = searchParams.get('language') || 'all';
  const sort = (searchParams.get('sort') as SortOption) || 'newest';

  const { addBook, addPackage } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [booksRes, catsRes, packagesRes] = await Promise.all([
        supabase
          .from('books')
          .select('*, category:categories(*)')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('book_packages')
          .select('*, category:categories(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);
      setBooks((booksRes.data as Book[]) || []);
      setCategories((catsRes.data as Category[]) || []);

      const pkgData = (packagesRes.data as (BookPackage & { category?: Category | null })[]) || [];
      if (pkgData.length > 0) {
        const pkgIds = pkgData.map((p) => p.id);
        const { data: itemsData } = await supabase
          .from('package_items')
          .select('package_id, book_id, book:books(id, title, author, language)')
          .in('package_id', pkgIds);

        // Count books per package AND collect included book metadata for search
        const bookCounts: Record<string, number> = {};
        const includedBooksMap: Record<string, { title: string; author: string; language?: string }[]> = {};
        (itemsData || []).forEach((item: any) => {
          bookCounts[item.package_id] = (bookCounts[item.package_id] || 0) + 1;
          if (item.book) {
            includedBooksMap[item.package_id] = includedBooksMap[item.package_id] || [];
            includedBooksMap[item.package_id].push({
              title: item.book.title,
              author: item.book.author,
              language: item.book.language,
            });
          }
        });

        const pkgsWithCount = pkgData.map((pkg) => ({
          ...pkg,
          book_count: bookCounts[pkg.id] || 0,
          books: (includedBooksMap[pkg.id] || []) as any,
        }));
        setPackages(pkgsWithCount);
      } else {
        setPackages([]);
      }

      setLoading(false);
    })();
  }, []);

  const authors = useMemo(
    () =>
      Array.from(
        new Set([
          ...books.map((b) => b.author).filter(Boolean),
          ...packages.map((p) => p.author).filter(Boolean) as string[],
        ])
      ).sort(),
    [books, packages]
  );

  // Filter books
  const filteredBooks = useMemo(() => {
    let result = [...books];
    if (filter === 'featured') result = result.filter((b) => b.is_featured);
    if (filter === 'bestseller') result = result.filter((b) => b.is_bestseller);
    if (filter === 'new') result = result.filter((b) => b.is_new_arrival);
    if (categorySlug !== 'all') result = result.filter((b) => b.category?.slug === categorySlug);
    if (author) result = result.filter((b) => b.author === author);
    if (language !== 'all') result = result.filter((b) => b.language === language);
    result = result.filter((b) => {
      const price = b.discount_price && b.discount_price < b.price ? b.discount_price : b.price;
      return price >= minPrice && price <= maxPrice;
    });
    return result;
  }, [books, filter, categorySlug, author, language, minPrice, maxPrice]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    let result = [...packages];
    if (filter === 'featured') result = result.filter((p) => p.is_featured);
    if (filter === 'bestseller') result = result.filter((p) => p.is_bestseller);
    if (filter === 'new') result = result.filter((p) => true); // packages sorted by created_at below
    if (categorySlug !== 'all') result = result.filter((p) => p.category?.slug === categorySlug);
    if (author) result = result.filter((p) => p.author === author);
    if (language !== 'all') result = result.filter((p) => (p.language || 'Bangla') === language);
    result = result.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    return result;
  }, [packages, filter, categorySlug, author, language, minPrice, maxPrice]);

  // Merge and sort
  const mergedItems: DisplayItem[] = useMemo(() => {
    const items: DisplayItem[] = [
      ...filteredBooks.map((b) => ({ kind: 'book' as const, book: b })),
      ...filteredPackages.map((p) => ({ kind: 'package' as const, pkg: p })),
    ];

    const getCreatedAt = (it: DisplayItem) =>
      it.kind === 'book' ? it.book.created_at : it.pkg.created_at;
    const getPrice = (it: DisplayItem) =>
      it.kind === 'book'
        ? it.book.discount_price && it.book.discount_price < it.book.price
          ? it.book.discount_price
          : it.book.price
        : it.pkg.price;
    const getRating = (it: DisplayItem) =>
      it.kind === 'book' ? it.book.rating : it.pkg.rating || 0;
    const getSales = (it: DisplayItem) =>
      it.kind === 'book' ? it.book.sales_count : it.pkg.sales_count || 0;

    switch (sort) {
      case 'price-low':
        items.sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case 'price-high':
        items.sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case 'rating':
        items.sort((a, b) => getRating(b) - getRating(a));
        break;
      case 'bestselling':
        items.sort((a, b) => getSales(b) - getSales(a));
        break;
      default:
        items.sort((a, b) => new Date(b.created_at ?? getCreatedAt(b)).getTime() - new Date(a.created_at ?? getCreatedAt(a)).getTime());
    }
    return items;
  }, [filteredBooks, filteredPackages, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});

  const onAddBookToCart = (book: Book) => {
    if (!requireAuth()) return;
    addBook(book);
    toast(`${book.title} added to cart`, 'success');
  };

  const onAddPackageToCart = (pkg: BookPackage) => {
    if (!requireAuth()) return;
    addPackage(pkg);
    toast(`${pkg.name} added to cart`, 'success');
  };

  const onToggleBookWishlist = async (book: Book) => {
    await toggle(book);
    toast(has(book.id) ? 'Removed from wishlist' : 'Added to wishlist', 'success');
  };

  const activeFilterCount = [
    filter !== 'all' ? 1 : 0,
    categorySlug !== 'all' ? 1 : 0,
    author ? 1 : 0,
    language !== 'all' ? 1 : 0,
    minPrice > 0 ? 1 : 0,
    maxPrice < 5000 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-700">Collection</h3>
        <div className="space-y-1">
          {[
            { key: 'all', label: 'All Books' },
            { key: 'packages', label: 'Book Packages & Bundles' },
            { key: 'featured', label: 'Featured' },
            { key: 'bestseller', label: 'Best Sellers' },
            { key: 'new', label: 'New Arrivals' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => updateParam('filter', f.key)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                filter === f.key ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-700">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateParam('category', 'all')}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              categorySlug === 'all' ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-ink-600 hover:bg-ink-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParam('category', c.slug)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                categorySlug === c.slug ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-700">Language</h3>
        <div className="space-y-1">
          {['all', 'Bangla', 'English', 'Arabic'].map((l) => (
            <button
              key={l}
              onClick={() => updateParam('language', l)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                language === l ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {l === 'all' ? 'All Languages' : l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-700">Price Range</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minPrice || ''}
              onChange={(e) => updateParam('minPrice', e.target.value)}
              placeholder="Min"
              className="input py-2 text-sm"
            />
            <span className="text-ink-400">—</span>
            <input
              type="number"
              value={maxPrice === 5000 ? '' : maxPrice}
              onChange={(e) => updateParam('maxPrice', e.target.value)}
              placeholder="Max"
              className="input py-2 text-sm"
            />
          </div>
          <p className="text-xs text-ink-500">Prices in BDT (৳)</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-700">Author</h3>
        <select
          value={author}
          onChange={(e) => updateParam('author', e.target.value)}
          className="input py-2 text-sm"
        >
          <option value="">All Authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="btn-outline w-full">
          Clear All Filters
        </button>
      )}
    </div>
  );

  // Apply the "packages" filter (only packages) by emptying books
  const visibleItems: DisplayItem[] = useMemo(() => {
    if (filter === 'packages') {
      return mergedItems.filter((i) => i.kind === 'package');
    }
    return mergedItems;
  }, [mergedItems, filter]);

  const totalItems = visibleItems.length;
  const packageCount = visibleItems.filter((i) => i.kind === 'package').length;
  const bookCount = visibleItems.filter((i) => i.kind === 'book').length;

  return (
    <div>
      {/* Page header */}
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-10">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Shop</span>
          </nav>
          <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Islamic eBook Library</h1>
          <p className="mt-2 max-w-2xl text-ink-500">
            Browse our complete collection of authentic Islamic eBooks and special package bundles.
          </p>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <FilterPanel />
            </div>
          </aside>

          {/* Main */}
          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-ink-600">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    <span className="font-semibold">{totalItems}</span> item{totalItems !== 1 ? 's' : ''} found
                    {packageCount > 0 && (
                      <span className="text-ink-400"> ({packageCount} package{packageCount !== 1 ? 's' : ''}, {bookCount} book{bookCount !== 1 ? 's' : ''})</span>
                    )}
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="btn-outline py-2 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-600 px-1.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="input w-auto py-2 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="bestselling">Best Selling</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
                ))}
              </div>
            ) : totalItems === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No items found"
                description="Try adjusting your filters or search query."
                action={<button onClick={clearFilters} className="btn-primary">Clear Filters</button>}
              />
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {visibleItems.map((item) =>
                  item.kind === 'book' ? (
                    <BookCard
                      key={`book-${item.book.id}`}
                      book={item.book}
                      onAddToCart={onAddBookToCart}
                      onToggleWishlist={onToggleBookWishlist}
                      inWishlist={has(item.book.id)}
                    />
                  ) : (
                    <PackageCard
                      key={`pkg-${item.pkg.id}`}
                      pkg={item.pkg}
                      onAddToCart={onAddPackageToCart}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel />
            <button onClick={() => setShowFilters(false)} className="btn-primary mt-6 w-full">
              Show {totalItems} Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
