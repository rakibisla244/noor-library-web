import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Register() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast('Passwords do not match', 'error');
      return;
    }
    if (form.password.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.full_name);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Account created! Welcome to Noor Library.', 'success');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
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

          <h1 className="mt-8 text-3xl font-bold text-ink-900">Create Account</h1>
          <p className="mt-2 text-sm text-ink-500">Join thousands of Muslims reading authentic Islamic eBooks.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input pl-10"
                  placeholder="Your full name"
                />
              </div>
            </div>
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
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="input pl-10"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input required type="checkbox" className="mt-0.5 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500" />
              <span>I agree to the <Link to="/terms" className="font-semibold text-emerald-700">Terms & Conditions</Link> and <Link to="/privacy" className="font-semibold text-emerald-700">Privacy Policy</Link></span>
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Creating account...' : 'Create Account'} {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account? <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 lg:flex lg:flex-col lg:justify-center lg:p-16">
        <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight text-white">Begin your journey of knowledge</h2>
          <p className="mt-4 max-w-md text-emerald-100">Join Noor Library and gain access to hundreds of authentic Islamic eBooks.</p>
          <ul className="mt-8 space-y-4 text-emerald-100">
            {[
              { title: '500+ Authentic eBooks', desc: 'Quran, Hadith, Fiqh, Seerah, and more' },
              { title: 'Instant Download', desc: 'Access your books immediately after purchase' },
              { title: 'Affordable Prices', desc: 'Pay in BDT via bKash, Nagad, Rocket, SSLCommerz' },
              { title: 'Lifetime Access', desc: 'Your library is always with you' },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <div>
                  <p className="font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-emerald-200">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
