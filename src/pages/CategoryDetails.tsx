import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, BookOpen, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Book, Category, BookPackage } from '../lib/types';
import BookCard from '../components/BookCard';
import PackageCard from '../components/PackageCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import EmptyState from '../components/ui/EmptyState';

type DisplayItem =
  | { kind: 'book'; book: Book }
  | { kind: 'package'; pkg: BookPackage & { book_count: number } };

export default function CategoryDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [packages, setPackages] = useState<(BookPackage & { book_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const { addBook, addPackage } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data: cat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      setCategory(cat as Category | null);

      if (cat) {
        const categoryId = (cat as Category).id;

        const [booksRes, packagesRes] = await Promise.all([
          supabase
            .from('books')
            .select('*, category:categories(*)')
            .eq('category_id', categoryId)
            .eq('status', 'published')
            .order('rating', { ascending: false }),
          supabase
            .from('book_packages')
            .select('*, category:categories(*)')
            .eq('category_id', categoryId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        ]);

        setBooks((booksRes.data as Book[]) || []);

        const pkgData = (packagesRes.data as (BookPackage & { category?: Category | null })[]) || [];
        if (pkgData.length > 0) {
          const pkgIds = pkgData.map((p) => p.id);
          const { data: itemsData } = await supabase
            .from('package_items')
            .select('package_id')
            .in('package_id', pkgIds);

          const bookCounts: Record<string, number> = {};
          (itemsData || []).forEach((item: any) => {
            bookCounts[item.package_id] = (bookCounts[item.package_id] || 0) + 1;
          });

          const pkgsWithCount = pkgData.map((pkg) => ({
            ...pkg,
            book_count: bookCounts[pkg.id] || 0,
          }));
          setPackages(pkgsWithCount);
        } else {
          setPackages([]);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

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

  const mergedItems: DisplayItem[] = useMemo(() => {
    return [
      ...packages.map((p) => ({ kind: 'package' as const, pkg: p })),
      ...books.map((b) => ({ kind: 'book' as const, book: b })),
    ];
  }, [books, packages]);

  if (!loading && !category) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={BookOpen}
          title="Category not found"
          description="The category you are looking for does not exist."
          action={<Link to="/categories" className="btn-primary">View All Categories</Link>}
        />
      </div>
    );
  }

  return (
    <div>
      <section
        className="relative overflow-hidden py-14 text-white"
        style={{ backgroundColor: category?.color || '#047857' }}
      >
        <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
        <div className="container-page relative">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/categories" className="hover:text-white">Categories</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white">{category?.name}</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{category?.name}</h1>
              <p className="mt-1 max-w-2xl text-white/80">{category?.description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
            ))}
          </div>
        ) : mergedItems.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No items in this category yet"
            description="Check back soon — we are adding new titles regularly."
            action={<Link to="/shop" className="btn-primary">Browse All Books</Link>}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-ink-600">
              {mergedItems.length} item{mergedItems.length !== 1 ? 's' : ''} found
              {packages.length > 0 && ` (${packages.length} package${packages.length !== 1 ? 's' : ''}, ${books.length} book${books.length !== 1 ? 's' : ''})`}
            </p>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {mergedItems.map((item) =>
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
          </>
        )}
      </div>
    </div>
  );
}
