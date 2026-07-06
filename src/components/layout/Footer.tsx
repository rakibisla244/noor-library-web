import { Link } from 'react-router-dom';
import { BookOpen, Mail, Phone, MapPin, Facebook, Youtube, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

export default function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [socialUrls, setSocialUrls] = useState<{ facebook_url: string; youtube_url: string }>({
    facebook_url: '',
    youtube_url: '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['facebook_url', 'youtube_url']);
      const map: Record<string, string> = { facebook_url: '', youtube_url: '' };
      (data || []).forEach((s: { key: string; value: string }) => {
        map[s.key] = s.value || '';
      });
      setSocialUrls({ facebook_url: map.facebook_url, youtube_url: map.youtube_url });
    })();
  }, []);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    if (error) {
      if (error.code === '23505') {
        toast('You are already subscribed!', 'info');
      } else {
        toast(error.message, 'error');
      }
    } else {
      toast('Subscribed successfully! Check your inbox.', 'success');
      setEmail('');
    }
    setSubscribing(false);
  };

  return (
    <footer className="relative mt-20 overflow-hidden bg-ink-900 text-ink-200">
      <div className="absolute inset-0 bg-islamic-pattern opacity-30" />
      <div className="relative">
        {/* Newsletter */}
        <div className="border-b border-white/10">
          <div className="container-page grid items-center gap-8 py-12 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-bold text-white">Stay Connected with Noor</h3>
              <p className="mt-2 text-sm text-ink-300">
                Subscribe to receive new book alerts, exclusive discounts, and Islamic articles.
              </p>
            </div>
            <form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-ink-400 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60 sm:w-auto"
              >
                <Send className="h-4 w-4" /> Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Main */}
        <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white sm:h-10 sm:w-10 sm:rounded-xl">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="font-display text-base font-extrabold text-white whitespace-nowrap sm:text-lg">Noor Library</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              Bangladesh's premier marketplace for authentic Islamic eBooks. We make knowledge accessible to every Muslim.
            </p>
            <div className="mt-5 flex gap-2">
              {socialUrls.facebook_url && (
                <a
                  href={socialUrls.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-ink-300 transition hover:bg-emerald-600 hover:text-white"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialUrls.youtube_url && (
                <a
                  href={socialUrls.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-ink-300 transition hover:bg-emerald-600 hover:text-white"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/shop" className="text-ink-300 transition hover:text-emerald-400">All Books</Link></li>
              <li><Link to="/categories" className="text-ink-300 transition hover:text-emerald-400">Categories</Link></li>
              <li><Link to="/blog" className="text-ink-300 transition hover:text-emerald-400">Blog</Link></li>
              <li><Link to="/about" className="text-ink-300 transition hover:text-emerald-400">About Us</Link></li>
              <li><Link to="/faq" className="text-ink-300 transition hover:text-emerald-400">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Account</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/login" className="text-ink-300 transition hover:text-emerald-400">Sign In</Link></li>
              <li><Link to="/register" className="text-ink-300 transition hover:text-emerald-400">Register</Link></li>
              <li><Link to="/dashboard" className="text-ink-300 transition hover:text-emerald-400">My Dashboard</Link></li>
              <li><Link to="/dashboard/orders" className="text-ink-300 transition hover:text-emerald-400">Order History</Link></li>
              <li><Link to="/dashboard/wishlist" className="text-ink-300 transition hover:text-emerald-400">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-ink-300">Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <a href="mailto:hello@noorlibrary.com" className="text-ink-300 transition hover:text-emerald-400">hello@noorlibrary.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <a href="tel:+8801919100514" className="text-ink-300 transition hover:text-emerald-400">+880 1919-100514</a>
              </li>
            </ul>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">We Accept</p>
              <div className="flex flex-wrap gap-1.5">
                {['bKash', 'Nagad', 'Rocket', 'SSLCommerz'].map((m) => (
                  <span key={m} className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-ink-300">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-sm text-ink-400 md:flex-row">
            <p>© {new Date().getFullYear()} Noor Library. All rights reserved.</p>
            <div className="flex gap-5">
              <Link to="/privacy" className="transition hover:text-emerald-400">Privacy Policy</Link>
              <Link to="/terms" className="transition hover:text-emerald-400">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
