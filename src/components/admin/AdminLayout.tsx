import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  ShoppingCart,
  Users,
  Star,
  Ticket,
  Newspaper,
  Settings,
  LogOut,
  BookMarked,
  Menu,
  X,
  ArrowLeft,
  CreditCard,
  Bell,
  MessageSquare,
  Package,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/books', label: 'Books', icon: BookOpen },
  { to: '/admin/packages', label: 'Packages', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/blog', label: 'Blog Posts', icon: Newspaper },
  { to: '/admin/tickets', label: 'Support Tickets', icon: MessageSquare },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/payment-methods', label: 'Payment Methods', icon: CreditCard },
];

export default function AdminLayout() {
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCounts = async () => {
      // Unread notifications
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);
      setNotifCount(count || 0);

      // Pending orders awaiting verification
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'pending_verification');
      setPendingOrdersCount(pendingCount || 0);

      // Pending support tickets
      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingTicketsCount(ticketsCount || 0);
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);

    // Real-time: update unread count instantly when a notification is created
    const channel = supabase
      .channel('admin-layout-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        setNotifCount((c) => c + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
        if ((payload.new as { read?: boolean }).read) {
          setNotifCount((c) => Math.max(0, c - 1));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // While the auth state is still loading, don't flash "Access Denied" —
  // an admin navigating directly to /admin would otherwise see the denied
  // state for a frame before the profile resolves.
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        <p className="text-sm font-medium text-ink-500">Loading admin panel…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Access Denied</h1>
        <p className="mt-2 text-ink-500">You do not have permission to access the admin panel.</p>
        {!user && <Link to="/login" className="btn-primary mt-6">Sign In</Link>}
        {user && <Link to="/" className="btn-primary mt-6">Back to Home</Link>}
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-100 p-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-display text-base font-extrabold text-emerald-800">Noor Library</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">Admin Panel</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.to === '/admin/orders' && pendingOrdersCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                {pendingOrdersCount}
              </span>
            )}
            {item.to === '/admin/tickets' && pendingTicketsCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                {pendingTicketsCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      {/* Notifications bell in sidebar */}
      <div className="border-t border-ink-100 p-3">
        <Link
          to="/admin/notifications"
          className="relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
        >
          <Bell className="h-5 w-5" />
          Notifications
          {notifCount > 0 && (
            <span className="absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {notifCount}
            </span>
          )}
        </Link>
      </div>
      <div className="border-t border-ink-100 p-3">
        <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50">
          <ArrowLeft className="h-5 w-5" /> Back to Site
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
            {(profile?.full_name || 'A').charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{profile?.full_name || 'Admin'}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50/40">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-ink-100 bg-white lg:block">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl">
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main */}
        <div className="flex-1">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-700 hover:bg-ink-100">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-emerald-800">Admin Panel</span>
            <div className="flex items-center gap-1">
              <Link to="/admin/orders" className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100">
                <ShoppingCart className="h-5 w-5" />
                {pendingOrdersCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {pendingOrdersCount}
                  </span>
                )}
              </Link>
              <Link to="/admin/tickets" className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100">
                <MessageSquare className="h-5 w-5" />
                {pendingTicketsCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {pendingTicketsCount}
                  </span>
                )}
              </Link>
              <Link to="/admin/notifications" className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100">
                <Bell className="h-5 w-5" />
                {notifCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {notifCount}
                  </span>
                )}
              </Link>
              <Link to="/" className="rounded-lg p-2 text-ink-700 hover:bg-ink-100">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <main className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
