import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BookPackage } from '../lib/types';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePurchaseGuard } from '../lib/usePurchaseGuard';
import { FullPageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import PackageCard from '../components/PackageCard';

export default function Packages() {
  const [packages, setPackages] = useState<(BookPackage & { book_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { addPackage } = useCart();
  const { toast } = useToast();
  const requireAuth = usePurchaseGuard();

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_packages')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pkgData = (data as (BookPackage & { category?: any })[]) || [];
      if (pkgData.length === 0) {
        setPackages([]);
        return;
      }

      // Get book counts AND included book metadata for search
      const pkgIds = pkgData.map((p) => p.id);
      const { data: itemsData } = await supabase
        .from('package_items')
        .select('package_id, book_id, book:books(id, title, author, language, slug)')
        .in('package_id', pkgIds);

      const bookCounts: Record<string, number> = {};
      const includedBooksMap: Record<string, any[]> = {};
      (itemsData || []).forEach((item: any) => {
        bookCounts[item.package_id] = (bookCounts[item.package_id] || 0) + 1;
        if (item.book) {
          includedBooksMap[item.package_id] = includedBooksMap[item.package_id] || [];
          includedBooksMap[item.package_id].push(item.book);
        }
      });

      const pkgsWithCount = pkgData.map((pkg) => ({
        ...pkg,
        book_count: bookCounts[pkg.id] || 0,
        books: (includedBooksMap[pkg.id] || []) as any,
      }));

      setPackages(pkgsWithCount);
    } catch (err) {
      console.error('Failed to load packages:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const onAddToCart = (pkg: BookPackage) => {
    if (!requireAuth()) return;
    addPackage(pkg);
    toast(`${pkg.name} added to cart`, 'success');
  };

  const filteredPackages = packages.filter((pkg) => {
    const q = searchQuery.toLowerCase();
    return (
      pkg.name.toLowerCase().includes(q) ||
      (pkg.slug && pkg.slug.toLowerCase().includes(q)) ||
      (pkg.author && pkg.author.toLowerCase().includes(q)) ||
      (pkg.description && pkg.description.toLowerCase().includes(q)) ||
      (pkg.tags && pkg.tags.some((t) => t.toLowerCase().includes(q))) ||
      (pkg.islamic_topic && pkg.islamic_topic.toLowerCase().includes(q)) ||
      (pkg.books && pkg.books.some((b: any) => b.title.toLowerCase().includes(q)))
    );
  });

  const featuredPackages = filteredPackages.filter((p) => p.is_featured || p.is_bestseller);
  const otherPackages = filteredPackages.filter((p) => !p.is_featured && !p.is_bestseller);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm text-ink-500">
          <Link to="/" className="hover:text-emerald-700">Home</Link>
          <span>/</span>
          <span className="text-ink-900">Packages</span>
        </nav>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Package className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-ink-900">Book Packages & Bundles</h1>
                <p className="text-ink-500">Special collections of multiple Islamic eBooks at discounted prices</p>
              </div>
            </div>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search packages by name, author, or included books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      </div>

      {filteredPackages.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchQuery ? "No packages match your search" : "No packages available"}
          description={searchQuery ? "Try a different search term." : "Check back soon for special book bundle deals!"}
          action={
            <Link to="/shop" className="btn-primary">
              Browse Books Instead
            </Link>
          }
        />
      ) : (
        <>
          {/* Featured Packages */}
          {featuredPackages.length > 0 && (
            <section className="mb-12">
              <div className="mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-ink-900">Featured Packages</h2>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {featuredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Packages */}
          {otherPackages.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink-900">All Packages</h2>
                <p className="text-sm text-ink-500">
                  {otherPackages.length} package{otherPackages.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {otherPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
