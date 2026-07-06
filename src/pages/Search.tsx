import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, ChevronRight, BookOpen, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Book, BookPackage } from '../lib/types';
import BookCard from '../components/BookCard';
import PackageCard from '../components/PackageCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import EmptyState from '../components/ui/EmptyState';

const POPULAR_SUGGESTIONS = ['Quran', 'Hadith', 'Fiqh', 'Seerah', 'Tafsir', 'Children', 'Bangla'];

type SearchResult = {
  books: Book[];
  packages: (BookPackage & { book_count: number })[];
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResult>({ books: [], packages: [] });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { addBook, addPackage } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    (async () => {
      if (!q.trim()) {
        setResults({ books: [], packages: [] });
        return;
      }
      setLoading(true);

      // Search books
      const { data: booksData } = await supabase
        .from('books')
        .select('*, category:categories(*)')
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,description.ilike.%${q}%`)
        .order('rating', { ascending: false })
        .limit(24);

      // Search packages by name, slug, author, description, tags, islamic_topic
      const { data: packagesData } = await supabase
        .from('book_packages')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,author.ilike.%${q}%,description.ilike.%${q}%,islamic_topic.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(12);

      const pkgData = (packagesData as (BookPackage & { category?: any })[]) || [];

      // Also search packages by their included book titles via package_items join
      let extraPackages: (BookPackage & { category?: any })[] = [];
      if (pkgData.length < 12) {
        const { data: itemsByBook } = await supabase
          .from('package_items')
          .select('package_id, book:books!inner(id, title)')
          .ilike('book.title', `%${q}%`)
          .limit(50);

        if (itemsByBook && itemsByBook.length > 0) {
          const foundPkgIds = Array.from(
            new Set(itemsByBook.map((it: any) => it.package_id))
          ).filter((id) => !pkgData.some((p) => p.id === id));

          if (foundPkgIds.length > 0) {
            const { data: extraData } = await supabase
              .from('book_packages')
              .select('*, category:categories(*)')
              .eq('is_active', true)
              .in('id', foundPkgIds)
              .order('created_at', { ascending: false });
            extraPackages = (extraData as (BookPackage & { category?: any })[]) || [];
          }
        }
      }

      const allPkgs = [...pkgData, ...extraPackages];

      // Get book counts for all found packages
      let packagesWithCount: (BookPackage & { book_count: number })[] = [];
      if (allPkgs.length > 0) {
        const packageIds = allPkgs.map((p) => p.id);
        const { data: itemsData } = await supabase
          .from('package_items')
          .select('package_id, book_id, book:books(id, title, author, language)')
          .in('package_id', packageIds);

        const bookCounts: Record<string, number> = {};
        const includedBooksMap: Record<string, any[]> = {};
        (itemsData || []).forEach((item: any) => {
          bookCounts[item.package_id] = (bookCounts[item.package_id] || 0) + 1;
          if (item.book) {
            includedBooksMap[item.package_id] = includedBooksMap[item.package_id] || [];
            includedBooksMap[item.package_id].push(item.book);
          }
        });

        packagesWithCount = allPkgs.map((pkg) => ({
          ...pkg,
          book_count: bookCounts[pkg.id] || 0,
          books: (includedBooksMap[pkg.id] || []) as any,
        }));
      }

      setResults({
        books: (booksData as Book[]) || [],
        packages: packagesWithCount,
      });
      setLoading(false);
    })();
  }, [q]);

  // Live suggestions
  useEffect(() => {
    if (!input.trim() || input === q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const [bookTitles, packageNames] = await Promise.all([
        supabase.from('books').select('title').ilike('title', `%${input}%`).limit(3),
        supabase
          .from('book_packages')
          .select('name')
          .ilike('name', `%${input}%`)
          .eq('is_active', true)
          .limit(2),
      ]);
      const bookSuggestions = bookTitles.data?.map((d: { title: string }) => d.title) || [];
      const packageSuggestions = packageNames.data?.map((d: { name: string }) => d.name) || [];
      setSuggestions([...bookSuggestions, ...packageSuggestions]);
    }, 200);
    return () => clearTimeout(t);
  }, [input, q]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
      setSuggestions([]);
    }
  };

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

  const totalResults = results.books.length + results.packages.length;

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-10">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Search</span>
          </nav>
          <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Search Results</h1>
          {q && (
            <p className="mt-2 text-ink-500">
              Showing results for "<span className="font-semibold text-emerald-700">{q}</span>"
            </p>
          )}

          <form onSubmit={onSearch} className="relative mt-6 max-w-2xl">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search books, authors, packages..."
              className="w-full rounded-full border border-ink-200 bg-white py-3.5 pl-12 pr-24 text-sm shadow-soft focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:pr-32"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:px-5"
            >
              Search
            </button>
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      setSearchParams({ q: s });
                      setSuggestions([]);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-emerald-50"
                  >
                    <SearchIcon className="h-4 w-4 text-ink-400" /> {s}
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Popular:</span>
            {POPULAR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSearchParams({ q: s })}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        {!q ? (
          <EmptyState
            icon={SearchIcon}
            title="Start your search"
            description="Type a book title, author name, package name, or topic in the search box above."
          />
        ) : loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
            ))}
          </div>
        ) : totalResults === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`No results found for "${q}"`}
            description="Try different keywords or browse our categories."
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
        ) : (
          <>
            <p className="mb-6 text-sm text-ink-600">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
              {results.books.length > 0 &&
                ` (${results.books.length} book${results.books.length !== 1 ? 's' : ''})`}
              {results.packages.length > 0 &&
                ` (${results.packages.length} package${results.packages.length !== 1 ? 's' : ''})`}
            </p>

            {/* Packages Results */}
            {results.packages.length > 0 && (
              <section className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-ink-900">Packages</h2>
                </div>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {results.packages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onAddToCart={onAddPackageToCart}
                    />
                  ))}
                </div>
                <Link
                  to="/packages"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View all packages <ChevronRight className="h-4 w-4" />
                </Link>
              </section>
            )}

            {/* Books Results */}
            {results.books.length > 0 && (
              <section>
                {results.packages.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-ink-900">Books</h2>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {results.books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onAddToCart={onAddBookToCart}
                      onToggleWishlist={onToggleBookWishlist}
                      inWishlist={has(book.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
