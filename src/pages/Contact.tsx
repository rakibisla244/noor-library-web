import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('contact_messages').insert(form);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Message sent! We will get back to you soon.', 'success');
      setForm({ name: '', email: '', subject: '', message: '' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-12">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Get in Touch</h1>
          <p className="mt-2 max-w-2xl text-ink-500">Have a question, suggestion, or need help? We would love to hear from you.</p>
        </div>
      </section>

      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          {/* Contact info */}
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email Us', value: 'hello@noorlibrary.com', href: 'mailto:hello@noorlibrary.com' },
              { icon: Phone, title: 'Call Us', value: '+880 1919-100514', href: 'tel:+8801919100514' },
              { icon: MapPin, title: 'Visit Us', value: 'Dhaka, Bangladesh' },
              { icon: Clock, title: 'Working Hours', value: 'Sat - Thu, 9:00 AM - 6:00 PM' },
            ].map((c) => (
              <div key={c.title} className="card flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <c.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-500">{c.title}</p>
                  {c.href ? (
                    <a href={c.href} className="text-lg font-bold text-ink-900 hover:text-emerald-700">{c.value}</a>
                  ) : (
                    <p className="text-lg font-bold text-ink-900">{c.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="card p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-700" />
                <h3 className="font-bold text-ink-900">Need quick help?</h3>
              </div>
              <p className="mt-2 text-sm text-ink-600">Check our <a href="/faq" className="link">FAQ page</a> for answers to common questions about payments, downloads, and accounts.</p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-ink-900">Send us a message</h2>
            <p className="mt-1 text-sm text-ink-500">We typically respond within 24 hours.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Your Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input resize-none"
                  placeholder="Write your message..."
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <Send className="h-4 w-4" /> {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
