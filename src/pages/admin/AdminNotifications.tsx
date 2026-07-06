import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingCart,
  CreditCard,
  Star,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Mail,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/types';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  admin_email_sent: boolean;
  created_at: string;
  order_id: string | null;
  user_id: string | null;
}

const TYPE_META: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  new_order: { icon: ShoppingCart, color: 'bg-teal-100 text-teal-600', label: 'Order' },
  new_payment: { icon: CreditCard, color: 'bg-amber-100 text-amber-600', label: 'Payment' },
  payment_pending: { icon: Clock, color: 'bg-amber-100 text-amber-600', label: 'Payment' },
  payment_approved: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600', label: 'Payment' },
  payment_rejected: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Payment' },
  new_review: { icon: Star, color: 'bg-gold-100 text-gold-700', label: 'Review' },
  new_ticket: { icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600', label: 'Ticket' },
  new_customer: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', label: 'Customer' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new_order', label: 'Orders' },
  { key: 'new_payment', label: 'Payments' },
  { key: 'new_review', label: 'Reviews' },
  { key: 'new_ticket', label: 'Tickets' },
];

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Real-time: refresh whenever any notification changes
    const channel = supabase
      .channel('admin-notifications-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unread);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
            <Bell className="h-6 w-6 text-amber-500" /> Notification Center
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Real-time alerts for orders, payments, reviews, and support tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              <Bell className="h-4 w-4" /> {unreadCount} unread
            </span>
          )}
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-ink-400" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? 'bg-emerald-600 text-white'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-20 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">No notifications</h3>
          <p className="mt-2 text-sm text-ink-500">
            You're all caught up. New customer activity will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.new_customer;
            const Icon = meta.icon;
            const d = n.data || {};
            return (
              <div
                key={n.id}
                className={`card flex items-start gap-4 p-4 transition ${
                  n.read ? 'border-ink-100' : 'border-l-4 border-l-amber-400 bg-amber-50/40'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${n.read ? 'text-ink-700' : 'text-ink-900'}`}>
                      {n.title}
                    </p>
                    <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      {meta.label}
                    </span>
                    {n.admin_email_sent && (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <Mail className="h-3 w-3" /> emailed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-600">{n.message}</p>

                  {/* Detail chips */}
                  {(d.customer_name || d.customer_email || d.order_number || d.amount || d.payment_method || d.txn_id || d.book_title) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.customer_name && (
                        <span className="rounded-md bg-ink-50 px-2 py-0.5 text-xs text-ink-600">
                          {String(d.customer_name)}
                        </span>
                      )}
                      {d.customer_email && (
                        <span className="rounded-md bg-ink-50 px-2 py-0.5 text-xs text-ink-600">
                          {String(d.customer_email)}
                        </span>
                      )}
                      {d.order_number && (
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                          {String(d.order_number)}
                        </span>
                      )}
                      {d.amount !== undefined && d.amount !== null && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          ৳{Number(d.amount)}
                        </span>
                      )}
                      {d.payment_method && (
                        <span className="rounded-md bg-ink-50 px-2 py-0.5 text-xs capitalize text-ink-600">
                          {String(d.payment_method)}
                        </span>
                      )}
                      {d.txn_id && (
                        <span className="rounded-md bg-ink-50 px-2 py-0.5 text-xs font-mono text-ink-600">
                          TXN: {String(d.txn_id)}
                        </span>
                      )}
                      {d.book_title && (
                        <span className="rounded-md bg-gold-50 px-2 py-0.5 text-xs text-gold-700">
                          {String(d.book_title)}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-1.5 text-xs text-ink-400">{formatDateTime(n.created_at)}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    {n.order_id && (
                      <Link
                        to="/admin/orders"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        View
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title="Mark as read"
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      title="Delete"
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
