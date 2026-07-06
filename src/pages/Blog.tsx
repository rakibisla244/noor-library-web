import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BlogPost } from '../lib/types';
import { formatDate } from '../lib/types';
import EmptyState from '../components/ui/EmptyState';
import { BookOpen } from 'lucide-react';

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false });
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    })();
  }, []);

  const categories = ['all', ...Array.from(new Set(posts.map((p) => p.category)))];
  const filtered = category === 'all' ? posts : posts.filter((p) => p.category === category);

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-12">
        <div className="container-page">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
            <Link to="/" className="hover:text-emerald-700">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink-700">Blog</span>
          </nav>
          <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Noor Blog</h1>
          <p className="mt-2 max-w-2xl text-ink-500">Islamic articles, book reviews, and educational content to nourish your mind and soul.</p>
        </div>
      </section>

      <div className="container-page py-12">
        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === c
                  ? 'bg-emerald-700 text-white'
                  : 'border border-ink-200 bg-white text-ink-700 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {c === 'all' ? 'All Posts' : c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 skeleton rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={BookOpen} title="No posts found" description="Check back soon for new articles." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="aspect-[16/10] overflow-hidden bg-ink-100">
                  <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="badge bg-emerald-100 text-emerald-700 self-start">{post.category}</span>
                  <h3 className="mt-3 line-clamp-2 text-lg font-bold text-ink-900 group-hover:text-emerald-700">{post.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-500">{post.excerpt}</p>
                  <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {post.author}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(post.published_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
