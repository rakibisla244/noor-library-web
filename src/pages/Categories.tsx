import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category } from '../lib/types';

// Premium green gradient variations for each category
const categoryGradients: Record<string, { bg: string; border: string; hoverBorder: string; iconBg: string }> = {
  'quran-tafsir': {
    bg: 'bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50',
    border: 'border-emerald-200/80',
    hoverBorder: 'hover:border-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-600',
  },
  'hadith-sciences': {
    bg: 'bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100',
    border: 'border-green-200/80',
    hoverBorder: 'hover:border-green-400',
    iconBg: 'bg-gradient-to-br from-green-600 to-emerald-600',
  },
  'aqeedah-creed': {
    bg: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50',
    border: 'border-emerald-300/70',
    hoverBorder: 'hover:border-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-700 to-emerald-600',
  },
  'fiqh-jurisprudence': {
    bg: 'bg-gradient-to-br from-teal-50 via-emerald-50 to-emerald-50',
    border: 'border-teal-200/80',
    hoverBorder: 'hover:border-teal-400',
    iconBg: 'bg-gradient-to-br from-teal-600 to-emerald-600',
  },
  'seerah-biography': {
    bg: 'bg-gradient-to-br from-emerald-50 via-gold-50/30 to-emerald-50',
    border: 'border-amber-200/60',
    hoverBorder: 'hover:border-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-600 to-emerald-600',
  },
  'islamic-history': {
    bg: 'bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-50',
    border: 'border-slate-200/80',
    hoverBorder: 'hover:border-slate-400',
    iconBg: 'bg-gradient-to-br from-slate-600 to-emerald-600',
  },
  'tasawwuf-spirituality': {
    bg: 'bg-gradient-to-br from-emerald-50 via-cyan-50/50 to-emerald-100',
    border: 'border-cyan-200/70',
    hoverBorder: 'hover:border-cyan-400',
    iconBg: 'bg-gradient-to-br from-cyan-600 to-emerald-600',
  },
  'children-family': {
    bg: 'bg-gradient-to-br from-emerald-50 via-sky-50/50 to-emerald-50',
    border: 'border-sky-200/80',
    hoverBorder: 'hover:border-sky-400',
    iconBg: 'bg-gradient-to-br from-sky-500 to-emerald-600',
  },
  'default': {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    border: 'border-emerald-200/80',
    hoverBorder: 'hover:border-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
  },
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories(data as Category[] || []);
      setLoading(false);
    })();
  }, []);

  const getGradientStyle = (slug: string) => {
    return categoryGradients[slug] || categoryGradients['default'];
  };

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-10">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Categories</span>
          </nav>
          <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Browse Categories</h1>
          <p className="mt-2 max-w-2xl text-ink-500">Explore Islamic eBooks across major disciplines — from Quran and Hadith to Fiqh, Seerah, and more.</p>
        </div>
      </section>

      <div className="container-page py-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 skeleton rounded-2xl sm:h-48" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {categories.map((cat) => {
              const style = getGradientStyle(cat.slug);
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border-2 ${style.border} ${style.bg} p-4 sm:p-8 transition-all hover:-translate-y-1 ${style.hoverBorder} hover:shadow-lg`}
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl`}
                    style={{ background: cat.color ? `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)` : undefined }}
                  >
                    <BookOpen className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                  <h3 className="relative mt-3 text-base font-bold text-ink-900 group-hover:text-emerald-700 sm:mt-5 sm:text-xl">{cat.name}</h3>
                  <p className="relative mt-1 hidden text-sm text-ink-500 sm:block sm:mt-2">{cat.description}</p>
                  <div className="relative mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
                    Explore books <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
