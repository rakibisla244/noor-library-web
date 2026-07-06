import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Heart, CreditCard, TrendingUp, ArrowRight, Library } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatBDT, formatDate } from '../../lib/types';
import type { Order, Book } from '../../lib/types';
import EmptyState from '../../components/ui/EmptyState';

export default function DashboardOverview() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ books: 0, downloads: 0, wishlist: 0, spent: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [orders, downloads, wishlist] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).eq('payment_status', 'paid').order('created_at', { ascending: false }),
        supabase.from('downloads').select('id').eq('user_id', user.id),
        supabase.from('wishlists').select('id').eq('user_id', user.id),
      ]);

      const paidOrders = (orders.data as Order[]) || [];
      const bookIds = new Set<string>();
      let spent = 0;
      paidOrders.forEach((o) => {
        spent += Number(o.total);
        // We need order items to get book ids — fetch separately
      });

      // Get purchased book ids via order_items
      if (paidOrders.length > 0) {
        const orderIds = paidOrders.map((o) => o.id);
        const { data: items } = await supabase.from('order_items').select('book_id').in('order_id', orderIds);
        (items || []).forEach((i: { book_id: string }) => bookIds.add(i.book_id));
        if (bookIds.size > 0) {
          const { data: booksData } = await supabase.from('books').select('*, category:categories(*)').in('id', Array.from(bookIds)).order('created_at', { ascending: false }).limit(4);
          setRecentBooks((booksData as Book[]) || []);
        }
      }

      setStats({
        books: bookIds.size,
        downloads: downloads.data?.length || 0,
        wishlist: wishlist.data?.length || 0,
        spent,
      });
      setRecentOrders(paidOrders.slice(0, 3));
      setLoading(false);
    })();
  }, [user]);

  const statCards = [
    { icon: Library, label: 'Purchased Books', value: stats.books, color: 'bg-emerald-50 text-emerald-700', link: '/dashboard/purchased-books' },
    { icon: Download, label: 'Total Downloads', value: stats.downloads, color: 'bg-teal-50 text-teal-700', link: '/dashboard/downloads' },
    { icon: Heart, label: 'Wishlist Items', value: stats.wishlist, color: 'bg-red-50 text-red-600', link: '/dashboard/wishlist' },
    { icon: CreditCard, label: 'Total Spent', value: formatBDT(stats.spent), color: 'bg-gold-50 text-gold-700', link: '/dashboard/orders' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Welcome back, {profile?.full_name?.split(' ')[0] || 'Reader'}!</h1>
        <p className="mt-1 text-sm text-ink-500">Here is an overview of your library and activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} to={s.link} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="text-sm text-ink-500">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent books */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Recent Purchases</h2>
          <Link to="/dashboard/purchased-books" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-xl" />)}
          </div>
        ) : recentBooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No purchases yet"
            description="Browse our collection and start building your Islamic library."
            action={<Link to="/shop" className="btn-primary">Browse Books</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentBooks.map((b) => (
              <Link key={b.id} to={`/book/${b.slug}`} className="group overflow-hidden rounded-xl border border-ink-100 bg-white transition hover:shadow-card">
                <img src={b.cover_url} alt={b.title} className="aspect-[3/4] w-full object-cover" />
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-ink-900 group-hover:text-emerald-700">{b.title}</p>
                  <p className="line-clamp-1 text-xs text-ink-500">{b.author}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Recent Orders</h2>
          <Link to="/dashboard/orders" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-500">No orders yet.</div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-ink-900">{o.order_number}</p>
                  <p className="text-xs text-ink-500">{formatDate(o.created_at)} • {o.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink-900">{formatBDT(Number(o.total))}</p>
                  <span className="badge bg-emerald-100 text-emerald-700 capitalize">{o.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-8 text-white">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-gold-400" />
          <div>
            <h3 className="text-xl font-bold text-white">Discover more books</h3>
            <p className="text-sm text-emerald-100">Explore our latest arrivals and bestsellers.</p>
          </div>
        </div>
        <Link to="/shop" className="btn-gold mt-5">
          Browse Books <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
