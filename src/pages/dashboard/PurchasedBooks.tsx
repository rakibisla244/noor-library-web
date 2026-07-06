import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, BookOpen, Library, Search, Clock, AlertCircle, CheckCircle, XCircle, Calendar, Info, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Book, BookPackage } from '../../lib/types';
import { formatDate } from '../../lib/types';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

interface PurchasedBook extends Book {
  order_status: 'approved' | 'pending_verification' | 'rejected';
  order_id: string;
  order_number: string;
  order_date: string;
}

interface PurchasedPackage extends BookPackage {
  order_status: 'approved' | 'pending_verification' | 'rejected';
  order_id: string;
  order_number: string;
  order_date: string;
  books: Book[];
}

export default function PurchasedBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<PurchasedBook[]>([]);
  const [packages, setPackages] = useState<PurchasedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingModal, setPendingModal] = useState<PurchasedBook | PurchasedPackage | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: 'all' | 'approved' | 'pending' =
    tabParam === 'pending' ? 'pending' : tabParam === 'approved' ? 'approved' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>(initialTab);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(
    tabParam === 'pending' ? searchParams.get('orderId') : null
  );

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Get all orders for this user
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!orders || orders.length === 0) {
      setBooks([]);
      setPackages([]);
      setLoading(false);
      return;
    }

    const orderMap = new Map(orders.map(o => [o.id, o]));
    const orderIds = orders.map(o => o.id);

    // Get all order items
    const { data: items } = await supabase
      .from('order_items')
      .select('id, book_id, order_id, package_id, is_package, book_title, book_cover')
      .in('order_id', orderIds);

    if (!items || items.length === 0) {
      setBooks([]);
      setPackages([]);
      setLoading(false);
      return;
    }

    // Separate package items and book items
    const packageItems = items.filter(i => i.is_package && i.package_id);
    const bookItems = items.filter(i => !i.is_package && i.book_id);

    // Process individual books
    const enrichedBooks: PurchasedBook[] = [];
    if (bookItems.length > 0) {
      const bookIds = Array.from(new Set(bookItems.map(i => i.book_id)));
      const { data: booksData } = await supabase
        .from('books')
        .select('*, category:categories(*)')
        .in('id', bookIds);

      if (booksData) {
        for (const item of bookItems) {
          const order = orderMap.get(item.order_id);
          const book = booksData.find(b => b.id === item.book_id);
          if (order && book) {
            enrichedBooks.push({
              ...book as Book,
              order_id: item.order_id,
              order_number: order.order_number,
              order_status: order.payment_status as 'approved' | 'pending_verification' | 'rejected',
              order_date: order.created_at,
            });
          }
        }
      }
    }

    // Process packages
    const enrichedPackages: PurchasedPackage[] = [];
    if (packageItems.length > 0) {
      const packageIds = Array.from(new Set(packageItems.map(i => i.package_id).filter(Boolean))) as string[];
      const { data: packagesData } = await supabase
        .from('book_packages')
        .select('*')
        .in('id', packageIds);

      if (packagesData && packagesData.length > 0) {
        // Batch-fetch all package_items + books for all packages at once
        const { data: allPkgItems } = await supabase
          .from('package_items')
          .select('package_id, book_id, book:books(*, category:categories(*))')
          .in('package_id', packageIds);

        // Group books by package_id
        const booksByPackage: Record<string, Book[]> = {};
        (allPkgItems || []).forEach((item: any) => {
          if (item.book) {
            booksByPackage[item.package_id] = booksByPackage[item.package_id] || [];
            booksByPackage[item.package_id].push(item.book as Book);
          }
        });

        for (const pkg of packagesData as BookPackage[]) {
          const pkgBooks = booksByPackage[pkg.id] || [];

          // Find the order item for this package
          const item = packageItems.find(i => i.package_id === pkg.id);
          if (item) {
            const order = orderMap.get(item.order_id);
            if (order) {
              enrichedPackages.push({
                ...pkg,
                books: pkgBooks,
                order_id: item.order_id,
                order_number: order.order_number,
                order_status: order.payment_status as 'approved' | 'pending_verification' | 'rejected',
                order_date: order.created_at,
              });
            }
          }
        }
      }
    }

    // Sort by order date descending
    enrichedBooks.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    enrichedPackages.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    setBooks(enrichedBooks);
    setPackages(enrichedPackages);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { id: string; payment_status: string };
          setBooks((prev) => prev.map((b) =>
            b.order_id === updated.id
              ? { ...b, order_status: updated.payment_status as PurchasedBook['order_status'] }
              : b
          ));
          setPackages((prev) => prev.map((p) =>
            p.order_id === updated.id
              ? { ...p, order_status: updated.payment_status as PurchasedPackage['order_status'] }
              : p
          ));
          if (updated.payment_status === 'approved') {
            toast('Your payment has been approved! You can now download.', 'success');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, toast]);

  const handleDownload = async (book: Book) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast('Please sign in to download', 'error');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-download?book_id=${book.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        toast(error.error || 'Download failed', 'error');
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
        toast('Download started', 'success');
      } else {
        toast('File not available', 'error');
      }
    } catch (err) {
      toast('Download failed. Please try again.', 'error');
    }
  };

  const togglePackageExpand = (packageId: string) => {
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  // Filter function
  const matchesFilter = (item: PurchasedBook | PurchasedPackage, searchLower: string) => {
    const name = 'title' in item ? item.title : item.name;
    const matchSearch = name.toLowerCase().includes(searchLower);
    const matchTab = activeTab === 'all' ||
      (activeTab === 'approved' && item.order_status === 'approved') ||
      (activeTab === 'pending' && item.order_status === 'pending_verification');
    return matchSearch && matchTab;
  };

  const filteredBooks = books.filter(b => matchesFilter(b, search.toLowerCase()));
  const filteredPackages = packages.filter(p => matchesFilter(p, search.toLowerCase()));

  const totalCount = books.length + packages.length;
  const approvedCount = books.filter(b => b.order_status === 'approved').length +
    packages.filter(p => p.order_status === 'approved').length;
  const pendingCount = books.filter(b => b.order_status === 'pending_verification').length +
    packages.filter(p => p.order_status === 'pending_verification').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case 'pending_verification':
        return <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"><Clock className="h-3 w-3" /> Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return null;
    }
  };

  const BookCard = ({ book }: { book: PurchasedBook }) => {
    const isPending = book.order_status === 'pending_verification';
    const isRejected = book.order_status === 'rejected';

    return (
      <div className={`group flex flex-col overflow-hidden rounded-xl border ${isPending ? 'border-orange-200 bg-orange-50/30' : isRejected ? 'border-red-200 bg-red-50/30' : 'border-ink-100 bg-white'} shadow-card`}>
        <Link to={`/book/${book.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-ink-100">
          <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-900/70">
              <Clock className="h-10 w-10 text-orange-200" />
            </div>
          )}
          {isRejected && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/70">
              <XCircle className="h-10 w-10 text-red-200" />
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col p-3">
          <div className="mb-1">{statusBadge(book.order_status)}</div>
          <Link to={`/book/${book.slug}`}>
            <h3 className="line-clamp-2 text-sm font-bold text-ink-900 hover:text-emerald-700">{book.title}</h3>
          </Link>
          <p className="line-clamp-1 text-xs text-ink-500">{book.author}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <Calendar className="h-3 w-3" /> {formatDate(book.order_date)}
          </p>
          <div className="mt-auto flex gap-1.5 pt-3">
            <button
              onClick={() => handleDownload(book)}
              disabled={isPending || isRejected}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                isPending
                  ? 'cursor-not-allowed border-2 border-orange-300 bg-orange-50 text-orange-500'
                  : isRejected
                    ? 'cursor-not-allowed bg-ink-100 text-ink-400'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {isPending ? (
                <><Clock className="h-3.5 w-3.5" /> Verifying</>
              ) : isRejected ? (
                <><XCircle className="h-3.5 w-3.5" /> Rejected</>
              ) : (
                <><Download className="h-3.5 w-3.5" /> Download</>
              )}
            </button>
            <Link to={`/book/${book.slug}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:bg-ink-50">
              <BookOpen className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const PackageCard = ({ pkg }: { pkg: PurchasedPackage }) => {
    const isPending = pkg.order_status === 'pending_verification';
    const isRejected = pkg.order_status === 'rejected';
    const isApproved = pkg.order_status === 'approved';
    const isExpanded = expandedPackages.has(pkg.id);
    const bookCount = pkg.books.length;

    return (
      <div className={`col-span-2 sm:col-span-1 overflow-hidden rounded-xl border ${isPending ? 'border-orange-200 bg-orange-50/30' : isRejected ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/50'} shadow-card`}>
        <div className="p-4">
          <div className="flex items-start gap-4">
            {pkg.cover_url ? (
              <img src={pkg.cover_url} alt={pkg.name} className="h-20 w-16 rounded-lg object-cover bg-ink-100" />
            ) : (
              <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-emerald-100">
                <Package className="h-10 w-10 text-emerald-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="mb-1">{statusBadge(pkg.order_status)}</div>
              <h3 className="line-clamp-2 font-bold text-ink-900">{pkg.name}</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {bookCount} {bookCount === 1 ? 'book' : 'books'} included
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                <Calendar className="h-3 w-3" /> {formatDate(pkg.order_date)}
              </p>
            </div>
          </div>

          <button
            onClick={() => togglePackageExpand(pkg.id)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white py-2 text-xs font-medium text-ink-600 hover:bg-ink-50"
          >
            {isExpanded ? (
              <><ChevronUp className="h-4 w-4" /> Hide Books</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Show Books ({bookCount})</>
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {bookCount === 0 ? (
                <p className="rounded-lg bg-white p-3 text-xs text-ink-500">
                  No books found in this package. Please contact support if you believe this is an error.
                </p>
              ) : (
                pkg.books.map((book) => (
                  <div key={book.id} className="flex items-center gap-2 rounded-lg bg-white p-2">
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="h-12 w-9 shrink-0 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-xs font-semibold text-ink-900">{book.title}</p>
                      <p className="line-clamp-1 text-[10px] text-ink-500">{book.author}</p>
                      {isApproved ? (
                        <button
                          onClick={() => handleDownload(book)}
                          className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      ) : isPending ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-600">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-600">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {isPending && (
            <p className="mt-3 text-xs text-orange-600">
              <Clock className="mr-1 inline h-3 w-3" />
              Payment verification in progress. You can download all {bookCount} books once approved.
            </p>
          )}
          {isApproved && bookCount > 0 && (
            <p className="mt-3 text-xs text-emerald-600">
              <CheckCircle className="mr-1 inline h-3 w-3" />
              Approved! Expand above to download any of the {bookCount} books.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">My Library</h1>
        <p className="mt-1 text-sm text-ink-500">All your purchased eBooks and packages. Download approved items instantly.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${activeTab === 'all' ? 'bg-emerald-700 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${activeTab === 'approved' ? 'bg-emerald-700 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
        >
          Approved ({approvedCount})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`relative rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${activeTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
        >
          Pending ({pendingCount})
          {pendingCount > 0 && activeTab !== 'pending' && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">{pendingCount}</span>
          )}
        </button>
      </div>

      {highlightOrderId && activeTab === 'pending' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Your payment is being verified. Please wait up to 30 minutes.</p>
            <p className="mt-1 text-xs text-orange-700">Once approved, your downloads will become active.</p>
          </div>
        </div>
      )}

      {(books.length > 0 || packages.length > 0) && (
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="input pl-10"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-xl" />)}
        </div>
      ) : filteredBooks.length === 0 && filteredPackages.length === 0 ? (
        <EmptyState
          icon={Library}
          title={search ? "No items match your search" : "Your library is empty"}
          description={search ? "Try a different search term." : activeTab === 'pending' ? "You have no pending orders." : "Purchase books or packages to start building your Islamic library."}
          action={!search && activeTab === 'all' && <Link to="/shop" className="btn-primary">Browse Shop</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {/* Packages first (they span 2 columns) */}
          {filteredPackages.map((pkg) => (
            <PackageCard key={`pkg-${pkg.id}-${pkg.order_id}`} pkg={pkg} />
          ))}
          {/* Then individual books */}
          {filteredBooks.map((book) => (
            <BookCard key={`${book.id}-${book.order_id}`} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
