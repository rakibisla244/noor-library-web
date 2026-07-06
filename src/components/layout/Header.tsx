import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  BookOpen,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Categories', to: '/categories' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'FAQ', to: '/faq' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { count, setOpen } = useCart();
  const { items: wishlist } = useWishlist();
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-ink-100 bg-white/95 shadow-soft backdrop-blur'
          : 'border-b border-transparent bg-white'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-soft sm:h-10 sm:w-10 sm:rounded-xl">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="font-display text-base font-extrabold text-emerald-800 whitespace-nowrap sm:text-lg">Noor Library</span>
        </Link>

        {/* Search (desktop) */}
        <form onSubmit={onSearch} className="relative hidden flex-1 max-w-md lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, authors, categories..."
            className="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-4 text-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition hover:bg-ink-100 lg:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/dashboard/wishlist"
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition hover:bg-ink-100 sm:flex"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
            {wishlist.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink-900">
                {wishlist.length}
              </span>
            )}
          </Link>

          <button
            onClick={() => setOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition hover:bg-ink-100"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu((s) => !s)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-ink-100"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" />
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-card animate-scale-in">
                    <div className="border-b border-ink-100 px-4 py-2">
                      <p className="truncate text-sm font-semibold text-ink-900">{profile?.full_name || 'User'}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/dashboard/wishlist" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 sm:hidden">
                      <Heart className="h-4 w-4" /> Wishlist
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">
                        <LayoutDashboard className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="hidden items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:flex">
              <User className="h-4 w-4" /> Sign In
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((s) => !s)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition hover:bg-ink-100 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden border-t border-ink-100 bg-white lg:block">
        <div className="container-page flex h-12 items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 text-sm font-medium transition ${
                  active ? 'text-emerald-700' : 'text-ink-700 hover:text-emerald-700'
                }`}
              >
                {link.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-emerald-600" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile search */}
      {searchOpen && (
        <div className="border-t border-ink-100 bg-white p-4 lg:hidden">
          <form onSubmit={onSearch} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white lg:hidden">
          <nav className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-ink-700 hover:bg-ink-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link to="/login" className="mt-2 rounded-lg bg-emerald-700 px-3 py-3 text-center text-sm font-semibold text-white">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
