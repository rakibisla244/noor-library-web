import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast(error.message, 'error');
    } else {
      setSent(true);
      toast('Reset link sent! Check your email.', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-extrabold text-emerald-800">Noor Library</span>
        </Link>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-ink-900">Check your email</h1>
              <p className="mt-2 text-sm text-ink-500">We have sent a password reset link to <span className="font-semibold text-ink-700">{email}</span></p>
              <Link to="/login" className="btn-primary mt-6">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ink-900">Forgot Password</h1>
              <p className="mt-2 text-sm text-ink-500">Enter your email and we will send you a reset link.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'} {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-ink-500">
                Remembered your password? <Link to="/login" className="font-semibold text-emerald-700">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
