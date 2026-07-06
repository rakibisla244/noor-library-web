import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Calendar, User, ArrowLeft, Share2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BlogPost } from '../lib/types';
import { formatDate } from '../lib/types';
import { FullPageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export default function BlogDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      setPost(data as BlogPost | null);
      if (data) {
        const p = data as BlogPost;
        const { data: rel } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .eq('category', p.category)
          .neq('id', p.id)
          .limit(3);
        setRelated((rel as BlogPost[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const onShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post?.title, url: window.location.href }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied', 'success');
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!post) {
    return (
      <div className="container-page py-20">
        <EmptyState icon={Tag} title="Article not found" description="The article you are looking for does not exist." action={<Link to="/blog" className="btn-primary">Back to Blog</Link>} />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[280px] overflow-hidden">
        <img src={post.cover_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/60 to-ink-900/30" />
        <div className="container-page relative flex h-full flex-col justify-end pb-10">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="hover:text-white">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white">{post.category}</span>
          </nav>
          <span className="badge bg-emerald-500/20 text-emerald-200 self-start backdrop-blur">{post.category}</span>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-bold text-white sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {post.author}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(post.published_at)}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
          <article>
            <p className="text-lg font-medium leading-relaxed text-ink-700">{post.excerpt}</p>
            <div className="mt-6 whitespace-pre-line leading-relaxed text-ink-700">{post.content}</div>

            {post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-ink-100 pt-6">
                {post.tags.map((t) => (
                  <span key={t} className="badge bg-ink-100 text-ink-700">
                    <Tag className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-6">
              <Link to="/blog" className="btn-outline">
                <ArrowLeft className="h-4 w-4" /> All Articles
              </Link>
              <button onClick={onShare} className="btn-ghost">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </article>

          <aside>
            <div className="card sticky top-28 p-6">
              <h3 className="font-bold text-ink-900">Related Articles</h3>
              {related.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">No related articles.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {related.map((r) => (
                    <Link key={r.id} to={`/blog/${r.slug}`} className="group flex gap-3">
                      <img src={r.cover_url} alt={r.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-ink-900 group-hover:text-emerald-700">{r.title}</p>
                        <p className="mt-1 text-xs text-ink-500">{formatDate(r.published_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
