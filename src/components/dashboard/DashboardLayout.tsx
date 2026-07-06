import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Download,
  Heart,
  User,
  Shield,
  CreditCard,
  LogOut,
  BookMarked,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/purchased-books', label: 'Purchased Books', icon: BookOpen },
  { to: '/dashboard/downloads', label: 'Download History', icon: Download },
  { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/dashboard/orders', label: 'Payment History', icon: CreditCard },
  { to: '/dashboard/profile', label: 'Profile Settings', icon: User },
  { to: '/dashboard/security', label: 'Security', icon: Shield },
];

export default function DashboardLayout() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-100 p-5">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
              {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{profile?.full_name || 'User'}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 rounded-xl bg-gold-50 px-3.5 py-2.5 text-sm font-medium text-gold-800 transition hover:bg-gold-100">
            <BookMarked className="h-5 w-5" /> Admin Panel
          </Link>
        )}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-ink-50/30">
      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
              <SidebarContent />
            </div>
          </aside>

          {/* Mobile sidebar toggle */}
          <div className="lg:hidden">
            <button onClick={() => setOpen(true)} className="btn-outline w-full">
              <Menu className="h-4 w-4" /> Dashboard Menu
            </button>
          </div>

          {/* Main content */}
          <main>
            <Outlet />
          </main>
        </div>
      </div>

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
    </div>
  );
}
