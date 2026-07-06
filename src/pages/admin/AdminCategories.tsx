import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Category } from '../../lib/types';
import Modal from '../../components/ui/Modal';

const empty = { name: '', slug: '', description: '', icon: 'BookOpen', color: '#047857' };

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description || '', icon: c.icon || 'BookOpen', color: c.color || '#047857' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name) { toast('Name is required', 'error'); return; }
    setSaving(true);
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const payload = { ...form, slug };
    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else toast('Category updated', 'success');
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) toast(error.message, 'error'); else toast('Category added', 'success');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) toast(error.message, 'error'); else toast('Category deleted', 'success');
    setDeleteId(null); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Categories</h1>
          <p className="mt-1 text-sm text-ink-500">{categories.length} categories.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> Add Category</button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.color || '#047857' }}>
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-4 font-bold text-ink-900">{c.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.description}</p>
              <p className="mt-2 text-xs text-ink-400">/{c.slug}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Slug (optional)</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" placeholder="auto-generated from name" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input resize-none" />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-16 rounded-lg border border-ink-200" />
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Category?" size="sm">
        <p className="text-sm text-ink-600">Are you sure? Books in this category will be uncategorized.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={confirmDelete} className="btn-danger flex-1"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </Modal>
    </div>
  );
}
