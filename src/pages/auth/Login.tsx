import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string; purchase?: boolean })?.from || '/dashboard';
  const isPurchase = (location.state as { purchase?: boolean })?.purchase || false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Welcome back!', 'success');
      navigate(from);
    }
    setLoading(false);
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 lg:flex lg:flex-col lg:justify-center lg:p-16">
        <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="font-display text-xl font-extrabold text-white">Noor Library</span>
          </Link>
          <h2 className="mt-10 text-3xl font-bold leading-tight text-white">Welcome back to your library of knowledge</h2>
          <p className="mt-4 max-w-md text-emerald-100">Sign in to access your purchased eBooks, wishlist, and download history.</p>
          <ul className="mt-8 space-y-3 text-emerald-100">
            {['Instant access to purchased books', 'Secure and encrypted', 'Lifetime access to your library'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-ink-900">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-extrabold text-emerald-800">Noor Library</span>
            </Link>
          </div>

          <h1 className="mt-8 text-3xl font-bold text-ink-900">Sign In</h1>
          <p className="mt-2 text-sm text-ink-500">Enter your credentials to access your account.</p>

          {isPurchase && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Info className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">Please sign in to purchase eBooks.</p>
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-600">
                <input type="checkbox" className="rounded border-ink-300 text-emerald-600 focus:ring-emerald-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-semibold text-emerald-700 hover:text-emerald-800">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Signing in...' : 'Sign In'} {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don't have an account? <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-800">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
