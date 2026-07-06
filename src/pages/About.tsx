import { Link } from 'react-router-dom';
import { BookOpen, LibraryBig, Heart, Users, Award, Shield, Globe } from 'lucide-react';

export default function About() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 py-20 text-white">
        <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
        <div className="container-page relative text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
            About Us
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-tight sm:text-5xl">
            Illuminating hearts with authentic Islamic knowledge
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-emerald-100">
            Noor Library is Bangladesh's premier marketplace for authentic Islamic eBooks, built to make knowledge accessible to every Muslim.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="heading-eyebrow">Our Story</span>
            <h2 className="mt-3 text-3xl font-bold text-ink-900">A mission born from love of knowledge</h2>
            <p className="mt-4 leading-relaxed text-ink-700">
              Noor Library was founded with a simple vision: to make authentic Islamic literature accessible to every Muslim, regardless of where they live or their financial means.
            </p>
            <p className="mt-4 leading-relaxed text-ink-700">
              In Bangladesh and across the world, many Muslims struggle to find reliable, authentic Islamic books in their own language. Physical bookstores are limited, and shipping is expensive. We believed there was a better way.
            </p>
            <p className="mt-4 leading-relaxed text-ink-700">
              Today, Noor Library offers hundreds of carefully curated eBooks in Bangla, English, and Arabic — from Quran and Hadith to Fiqh, Seerah, and children's literature. Every book is reviewed for authenticity before being listed.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/shop" className="btn-primary">Browse Books</Link>
              <Link to="/contact" className="btn-outline">Contact Us</Link>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg" alt="Islamic books" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-card" />
              <img src="https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg" alt="Quran reading" className="mt-8 aspect-[3/4] w-full rounded-2xl object-cover shadow-card" />
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="bg-ink-50/50 py-16">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Our Mission', desc: 'To make authentic Islamic knowledge accessible to every Muslim through affordable, instant, and secure digital books.' },
            { icon: LibraryBig, title: 'Our Vision', desc: 'A world where every Muslim has a library of authentic knowledge in their pocket, in their own language.' },
            { icon: Heart, title: 'Our Values', desc: 'Authenticity, accessibility, affordability, and service to the Ummah guide everything we do.' },
          ].map((c) => (
            <div key={c.title} className="card p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <c.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-ink-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container-page grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { icon: BookOpen, value: '500+', label: 'eBooks Available' },
            { icon: Users, value: '10K+', label: 'Happy Readers' },
            { icon: Globe, value: '30+', label: 'Countries Served' },
            { icon: Award, value: '4.8/5', label: 'Average Rating' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <s.icon className="h-7 w-7" />
              </div>
              <p className="mt-4 text-3xl font-extrabold text-ink-900">{s.value}</p>
              <p className="text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why trust us */}
      <section className="bg-emerald-950 py-16 text-white">
        <div className="container-page">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white">Why readers trust us</h2>
            <p className="mt-3 text-emerald-100">We are committed to authenticity, security, and service.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'Authentic Sources', desc: 'Every book is reviewed for authenticity and accuracy.' },
              { icon: BookOpen, title: 'Curated Collection', desc: 'Hand-picked titles from renowned scholars and publishers.' },
              { icon: Globe, title: 'Multi-Language', desc: 'Books available in Bangla, English, and Arabic.' },
              { icon: Heart, title: 'Reader First', desc: 'Affordable pricing and instant access for every reader.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/20 text-gold-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-emerald-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
