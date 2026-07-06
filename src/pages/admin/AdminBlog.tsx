import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, Loader2, Newspaper, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { BlogPost } from '../../lib/types';
import { formatDate } from '../../lib/types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

const empty = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  author: 'Noor Library Editorial',
  category: 'Articles',
  tags: '',
  status: 'published' as 'published' | 'draft',
};

export default function AdminBlog() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      cover_url: p.cover_url,
      author: p.author,
      category: p.category,
      tags: p.tags.join(', '),
      status: p.status,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title) { toast('Title is required', 'error'); return; }
    setSaving(true);
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt,
      content: form.content,
      cover_url: form.cover_url,
      author: form.author,
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: form.status,
    };
    if (editing) {
      const { error } = await supabase.from('blog_posts').update(payload).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else toast('Post updated', 'success');
    } else {
      const { error } = await supabase.from('blog_posts').insert(payload);
      if (error) toast(error.message, 'error'); else toast('Post created', 'success');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', deleteId);
    if (error) toast(error.message, 'error'); else toast('Post deleted', 'success');
    setDeleteId(null); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Blog Posts</h1>
          <p className="mt-1 text-sm text-ink-500">{posts.length} articles.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> New Post</button>
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Newspaper} title="No blog posts" description="Write your first Islamic article." action={<button onClick={openNew} className="btn-primary">New Post</button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="p-4 font-semibold">Post</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Author</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.cover_url} alt={p.title} className="h-12 w-16 rounded object-cover" />
                      <p className="line-clamp-1 font-semibold text-ink-900">{p.title}</p>
                    </div>
                  </td>
                  <td className="p-4 text-ink-700">{p.category}</td>
                  <td className="p-4 text-ink-700">{p.author}</td>
                  <td className="p-4 text-ink-500">{formatDate(p.published_at)}</td>
                  <td className="p-4"><Badge variant={p.status === 'published' ? 'emerald' : 'gold'}>{p.status}</Badge></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <a href={`/#/blog/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><ExternalLink className="h-4 w-4" /></a>
                      <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(p.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Post' : 'New Post'} size="xl">
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Author</label>
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Cover Image URL</label>
            <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} className="input resize-none font-mono text-sm" />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" placeholder="quran, hadith, fiqh" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'published' | 'draft' })} className="input">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Post?" size="sm">
        <p className="text-sm text-ink-600">Are you sure you want to delete this post?</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={confirmDelete} className="btn-danger flex-1"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </Modal>
    </div>
  );
}
