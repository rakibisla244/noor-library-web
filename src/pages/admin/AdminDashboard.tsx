import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  BookOpen,
  Download,
  Star,
  ArrowRight,
  DollarSign,
  Crown,
  CreditCard,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT, formatDate, formatDateTime } from '../../lib/types';
import type { Order, Book } from '../../lib/types';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
  order_id: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    users: 0,
    books: 0,
    downloads: 0,
    pendingReviews: 0,
    pendingPayments: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [bestSellers, setBestSellers] = useState<Book[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number }[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, users, books, downloads, reviews, best, pendingPayments, notifs] = await Promise.all([
        supabase.from('orders').select('*').eq('payment_status', 'approved').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('downloads').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('books').select('*, category:categories(*)').order('sales_count', { ascending: false }).limit(5),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending_verification'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const paidOrders = (orders.data as Order[]) || [];
      const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

      // Monthly revenue (last 6 months)
      const now = new Date();
      const months: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        const monthRevenue = paidOrders
          .filter((o) => {
            const od = new Date(o.created_at);
            return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
          })
          .reduce((sum, o) => sum + Number(o.total), 0);
        months.push({ month: monthName, revenue: monthRevenue });
      }

      setStats({
        revenue,
        orders: paidOrders.length,
        users: users.count || 0,
        books: books.count || 0,
        downloads: downloads.count || 0,
        pendingReviews: reviews.count || 0,
        pendingPayments: pendingPayments.count || 0,
      });
      setRecentOrders(paidOrders.slice(0, 5));
      setBestSellers((best.data as Book[]) || []);
      setMonthlyData(months);
      setNotifications((notifs.data as Notification[]) || []);
      setLoading(false);
    })();
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  const statCards = [
    { icon: DollarSign, label: 'Total Revenue', value: formatBDT(stats.revenue), color: 'bg-emerald-50 text-emerald-700', link: '/admin/orders' },
    { icon: ShoppingCart, label: 'Total Orders', value: stats.orders, color: 'bg-teal-50 text-teal-700', link: '/admin/orders' },
    { icon: CreditCard, label: 'Pending Payments', value: stats.pendingPayments, color: 'bg-amber-50 text-amber-700', link: '/admin/payments', highlight: stats.pendingPayments > 0 },
    { icon: Users, label: 'Total Users', value: stats.users, color: 'bg-gold-50 text-gold-700', link: '/admin/users' },
    { icon: BookOpen, label: 'Total Books', value: stats.books, color: 'bg-emerald-100 text-emerald-700', link: '/admin/books' },
    { icon: Star, label: 'Pending Reviews', value: stats.pendingReviews, color: 'bg-red-50 text-red-600', link: '/admin/reviews' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">Welcome to the Noor Library admin panel.</p>
        </div>
        {notifications.filter((n) => !n.read).length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">{notifications.filter((n) => !n.read).length}</span> new notifications
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Link key={s.label} to={s.link} className={`card group p-4 transition hover:-translate-y-0.5 hover:shadow-glow ${s.highlight ? 'ring-2 ring-amber-400' : ''}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xl font-bold text-ink-900">{s.value}</p>
            <p className="text-xs text-ink-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Monthly Revenue</h2>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex h-48 items-end justify-between gap-2">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all hover:from-emerald-700 hover:to-emerald-500"
                    style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                    title={formatBDT(m.revenue)}
                  />
                </div>
                <span className="text-xs font-medium text-ink-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best sellers */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Best Selling Books</h2>
            <Crown className="h-5 w-5 text-gold-500" />
          </div>
          <div className="space-y-3">
            {bestSellers.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-gold-100 text-gold-700' : i === 1 ? 'bg-ink-200 text-ink-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-ink-100 text-ink-500'
                }`}>{i + 1}</span>
                <img src={b.cover_url} alt={b.title} className="h-12 w-9 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-ink-900">{b.title}</p>
                  <p className="text-xs text-ink-500">{b.sales_count} sales</p>
                </div>
                <p className="text-sm font-bold text-emerald-700">{formatBDT(b.discount_price ?? b.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-ink-900">
            <Bell className="h-5 w-5 text-amber-500" /> Recent Notifications
          </h2>
          <Link to="/admin/payments" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            View payments <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}</div>
        ) : notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 rounded-lg border p-3 transition ${n.read ? 'border-ink-100 bg-ink-50' : 'border-amber-200 bg-amber-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.type === 'payment_pending' ? 'bg-amber-100 text-amber-600' : n.type === 'payment_approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {n.type === 'payment_pending' ? <Clock className="h-4 w-4" /> : n.type === 'payment_approved' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${n.read ? 'text-ink-700' : 'text-ink-900'}`}>{n.title}</p>
                    <p className="line-clamp-1 text-xs text-ink-500">{n.message}</p>
                    <p className="mt-1 text-xs text-ink-400">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.order_id && (
                    <Link to={`/admin/orders`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                      View Order
                    </Link>
                  )}
                  {!n.read && (
                    <button onClick={() => markAsRead(n.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100">
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-ink-900">Recent Orders</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}</div>
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="pb-2 pr-4 font-semibold">Order</th>
                  <th className="pb-2 pr-4 font-semibold">Customer</th>
                  <th className="pb-2 pr-4 font-semibold">Date</th>
                  <th className="pb-2 pr-4 font-semibold">Method</th>
                  <th className="pb-2 pr-4 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 font-semibold text-ink-900">{o.order_number}</td>
                    <td className="py-3 pr-4 text-ink-700">{o.customer_name}</td>
                    <td className="py-3 pr-4 text-ink-500">{formatDate(o.created_at)}</td>
                    <td className="py-3 pr-4 capitalize text-ink-700">{o.payment_method}</td>
                    <td className="py-3 pr-4"><span className="badge bg-emerald-100 text-emerald-700 capitalize">{o.payment_status}</span></td>
                    <td className="py-3 text-right font-bold text-ink-900">{formatBDT(Number(o.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
