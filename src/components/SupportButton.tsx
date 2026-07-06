import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase, drainAdminEmailQueue } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function SupportButton() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [form, setForm] = useState({
    name: profile?.full_name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  // Show popup periodically
  useEffect(() => {
    const showPopupInterval = () => {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
    };

    // Show after 15 seconds
    const initialTimer = setTimeout(showPopupInterval, 15000);

    // Then show every 20 seconds
    const interval = setInterval(showPopupInterval, 20000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });

    if (error) {
      toast(error.message, 'error');
    } else {
      drainAdminEmailQueue();
      toast('Your message has been sent. We will respond as soon as possible.', 'success');
      setForm({ name: profile?.full_name || '', email: user?.email || '', subject: '', message: '' });
      setOpen(false);
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Floating WhatsApp-style button */}
      <div className="fixed bottom-6 left-6 z-40">
        {/* Popup tooltip */}
        <div
          className={`absolute bottom-16 left-0 mb-2 w-48 transform rounded-xl bg-white p-3 shadow-lg ring-1 ring-ink-100 transition-all duration-300 ${
            showPopup && !open
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-2 scale-95 opacity-0 pointer-events-none'
          }`}
        >
          <div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 bg-white ring-1 ring-l-ink-100 [-webkit-clip-path:polygon(0_0,100%_0,100%_100%)] [clip-path:polygon(0_0,100%_0,100%_100%)]" />
          <p className="text-sm font-semibold text-ink-900">Need Help?</p>
          <p className="text-xs text-ink-500">Send us a message</p>
        </div>

        {/* Main button */}
        <button
          onClick={() => {
            setOpen(true);
            setShowPopup(false);
          }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all duration-300 hover:bg-emerald-700 hover:shadow-xl hover:scale-110"
          aria-label="Contact Support"
        >
          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full bg-emerald-600 animate-ping opacity-30" />
          <MessageCircle className="relative h-6 w-6" />
        </button>
      </div>

      {/* Support modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-ink-900">Contact Support</h2>
              <p className="mt-1 text-sm text-ink-500">We're here to help. Send us a message.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input"
                  placeholder="What is this about?"
                />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="input resize-none"
                  placeholder="Describe your issue or question..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
