import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, ExternalLink, Save, Loader2, Upload, X, Image, FileText, CheckCircle2, BookOpen, Download, Star, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Book, Category, BookLanguage } from '../../lib/types';
import { formatBDT, effectivePrice } from '../../lib/types';
import { uploadCoverImage, uploadPreviewPdf, uploadFullPdf } from '../../lib/uploads';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

type BookForm = {
  title: string;
  slug: string;
  author: string;
  description: string;
  short_description: string;
  price: number;
  discount_price: number | null;
  category_id: string;
  language: BookLanguage;
  pages: number;
  publisher: string;
  publication_date: string;
  file_size: string;
  cover_url: string;
  preview_url: string;
  file_url: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  status: 'published' | 'draft' | 'coming_soon' | 'archived';
};

type UploadState = {
  uploading: boolean;
  progress: number;
  error: string | null;
};

const emptyBook: BookForm = {
  title: '',
  slug: '',
  author: '',
  description: '',
  short_description: '',
  price: 0,
  discount_price: null,
  category_id: '',
  language: 'Bangla',
  pages: 0,
  publisher: '',
  publication_date: '',
  file_size: '',
  cover_url: '',
  preview_url: '',
  file_url: '',
  is_featured: false,
  is_bestseller: false,
  is_new_arrival: false,
  status: 'published',
};

function FileUploadZone({
  label,
  accept,
  currentUrl,
  onUpload,
  onClear,
  uploading,
  progress,
  error,
  preview,
  maxSize,
  icon: Icon,
}: {
  label: string;
  accept: string;
  currentUrl: string;
  onUpload: (file: File) => void;
  onClear: () => void;
  uploading: boolean;
  progress: number;
  error: string | null;
  preview?: boolean;
  maxSize: string;
  icon: typeof Image;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const isPdf = accept.includes('pdf');
  const isStorageUrl = currentUrl && currentUrl.includes('supabase.co/storage');
  const isDummyUrl = currentUrl && (currentUrl.includes('w3.org') || currentUrl.includes('file://'));

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      <div className="flex items-start gap-3">
        {preview && currentUrl ? (
          <div className="relative">
            <img src={currentUrl} alt="Preview" className="h-24 w-20 rounded-lg object-cover border border-ink-200" />
            <button
              type="button"
              onClick={onClear}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : isPdf && currentUrl ? (
          <div className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 ${
            isDummyUrl ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}>
            <FileText className={`h-5 w-5 ${isDummyUrl ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDummyUrl ? 'text-amber-700' : 'text-emerald-700'}`}>
              {isDummyUrl ? 'Needs replacement' : 'PDF uploaded'}
            </span>
            {isStorageUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 underline hover:text-emerald-800"
              >
                View
              </a>
            )}
            <button
              type="button"
              onClick={onClear}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex-1 cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
            dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-ink-200 hover:border-emerald-400 hover:bg-ink-50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            className="hidden"
          />
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-ink-500">{progress}% uploading...</p>
            </div>
          ) : currentUrl ? (
            <div className={`flex items-center justify-center gap-2 ${
              isDummyUrl ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                {isDummyUrl ? 'Replace with new file' : (isPdf ? 'PDF uploaded' : 'Image uploaded')}
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <Icon className="mx-auto h-6 w-6 text-ink-400" />
              <p className="text-sm font-medium text-ink-600">Drop file or click to upload</p>
              <p className="text-xs text-ink-400">Max {maxSize}</p>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3 transition hover:bg-ink-50"
    >
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {checked ? (
        <ToggleRight className="h-6 w-6 text-emerald-600" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-ink-400" />
      )}
    </button>
  );
}

export default function AdminBooks() {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState<BookForm>(emptyBook);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Upload states
  const [coverUpload, setCoverUpload] = useState<UploadState>({ uploading: false, progress: 0, error: null });
  const [previewUpload, setPreviewUpload] = useState<UploadState>({ uploading: false, progress: 0, error: null });
  const [pdfUpload, setPdfUpload] = useState<UploadState>({ uploading: false, progress: 0, error: null });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('books').select('*, category:categories(*)').order('created_at', { ascending: false });
    setBooks((data as Book[]) || []);
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    setCategories((cats as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setEditing(null);
    setForm({ ...emptyBook, category_id: categories[0]?.id || '' });
    setCoverUpload({ uploading: false, progress: 0, error: null });
    setPreviewUpload({ uploading: false, progress: 0, error: null });
    setPdfUpload({ uploading: false, progress: 0, error: null });
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setForm({
      title: book.title,
      slug: book.slug,
      author: book.author,
      description: book.description,
      short_description: book.short_description || '',
      price: book.price,
      discount_price: book.discount_price,
      category_id: book.category_id || '',
      language: book.language,
      pages: book.pages,
      publisher: book.publisher,
      publication_date: book.publication_date || '',
      file_size: book.file_size,
      cover_url: book.cover_url,
      preview_url: book.preview_url || '',
      file_url: book.file_url,
      is_featured: book.is_featured,
      is_bestseller: book.is_bestseller,
      is_new_arrival: book.is_new_arrival,
      status: book.status,
    });
    setCoverUpload({ uploading: false, progress: 0, error: null });
    setPreviewUpload({ uploading: false, progress: 0, error: null });
    setPdfUpload({ uploading: false, progress: 0, error: null });
    setModalOpen(true);
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUpload({ uploading: true, progress: 0, error: null });
    const result = await uploadCoverImage(file);
    if (result.error) {
      setCoverUpload({ uploading: false, progress: 0, error: result.error });
      toast(result.error, 'error');
    } else {
      setForm((f) => ({ ...f, cover_url: result.url }));
      setCoverUpload({ uploading: false, progress: 100, error: null });
      toast('Cover image uploaded', 'success');
    }
  };

  const handlePreviewUpload = async (file: File) => {
    setPreviewUpload({ uploading: true, progress: 0, error: null });
    const result = await uploadPreviewPdf(file);
    if (result.error) {
      setPreviewUpload({ uploading: false, progress: 0, error: result.error });
      toast(result.error, 'error');
    } else {
      setForm((f) => ({ ...f, preview_url: result.url }));
      setPreviewUpload({ uploading: false, progress: 100, error: null });
      toast('Preview PDF uploaded', 'success');
    }
  };

  const handlePdfUpload = async (file: File) => {
    setPdfUpload({ uploading: true, progress: 0, error: null });
    const result = await uploadFullPdf(file);
    if (result.error) {
      setPdfUpload({ uploading: false, progress: 0, error: result.error });
      toast(result.error, 'error');
    } else {
      setForm((f) => ({ ...f, file_url: result.url }));
      setPdfUpload({ uploading: false, progress: 100, error: null });
      toast('Full PDF uploaded', 'success');
    }
  };

  const save = async () => {
    if (!form.title || !form.author || !form.category_id) {
      toast('Title, author, and category are required', 'error');
      return;
    }
    if (!form.cover_url) {
      toast('Please upload a cover image', 'error');
      return;
    }
    if (!form.file_url) {
      toast('Please upload the full PDF', 'error');
      return;
    }
    setSaving(true);
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const payload = {
      title: form.title,
      slug,
      author: form.author,
      description: form.description,
      short_description: form.short_description,
      price: Number(form.price),
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      category_id: form.category_id,
      language: form.language,
      pages: Number(form.pages),
      publisher: form.publisher,
      publication_date: form.publication_date || null,
      file_size: form.file_size,
      cover_url: form.cover_url,
      preview_url: form.preview_url || null,
      file_url: form.file_url,
      is_featured: form.is_featured,
      is_bestseller: form.is_bestseller,
      is_new_arrival: form.is_new_arrival,
      status: form.status,
    };
    if (editing) {
      const { error } = await supabase.from('books').update(payload).eq('id', editing.id);
      if (error) toast(error.message, 'error');
      else toast('Book updated successfully', 'success');
    } else {
      const { error } = await supabase.from('books').insert(payload);
      if (error) toast(error.message, 'error');
      else toast('Book added successfully', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('books').delete().eq('id', deleteId);
    if (error) toast(error.message, 'error');
    else toast('Book deleted', 'success');
    setDeleteId(null);
    load();
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published': return 'emerald';
      case 'draft': return 'gold';
      case 'coming_soon': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Books Management</h1>
          <p className="mt-1 text-sm text-ink-500">{books.length} books in catalog.</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" /> Add New Book
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books..." className="input pl-10" />
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="p-4 font-semibold">Book</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Price</th>
                <th className="p-4 font-semibold">Flags</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Stats</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-ink-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={b.cover_url} alt={b.title} className="h-14 w-10 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold text-ink-900">{b.title}</p>
                        <p className="text-xs text-ink-500">{b.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-700">{b.category?.name || '—'}</td>
                  <td className="p-4">
                    <span className="font-bold text-ink-900">{formatBDT(effectivePrice(b))}</span>
                    {b.discount_price && <span className="ml-1 text-xs text-ink-400 line-through">{formatBDT(b.price)}</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {b.is_featured && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Featured</span>}
                      {b.is_bestseller && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Bestseller</span>}
                      {b.is_new_arrival && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-700">New</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusBadgeVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-ink-500">
                      <div className="flex items-center gap-2"><BookOpen className="h-3 w-3" /> {b.view_count || 0}</div>
                      <div className="flex items-center gap-2"><Download className="h-3 w-3" /> {b.download_count || 0}</div>
                      <div className="flex items-center gap-2"><Star className="h-3 w-3" /> {b.rating.toFixed(1)} ({b.review_count})</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <a href={`/#/book/${b.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" title="View">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(b.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create modal - Improved UI */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Book' : 'Add New Book'} size="xl">
        <div className="max-h-[75vh] overflow-y-auto pr-2">
          {/* Section 1: Basic Information */}
          <div className="mb-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-400">
              <Info className="h-4 w-4" /> Basic Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="label">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="Enter book title" />
              </div>
              <div>
                <label className="label">Author *</label>
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input" placeholder="Author name" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Short Description (150-250 chars)</label>
                <div className="relative">
                  <textarea
                    value={form.short_description}
                    onChange={(e) => setForm({ ...form, short_description: e.target.value.slice(0, 250) })}
                    rows={2}
                    className="input resize-none"
                    placeholder="Brief summary for book cards and previews..."
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-ink-400">{form.short_description.length}/250</span>
                </div>
              </div>
              <div>
                <label className="label">Category *</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Language</label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as BookLanguage })} className="input">
                  {['Bangla', 'English', 'Arabic', 'Urdu'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" placeholder="Auto-generated if empty" />
              </div>
            </div>
          </div>

          {/* Section 2: Publication Details */}
          <div className="mb-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-400">
              <FileText className="h-4 w-4" /> Publication Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Publisher</label>
                <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="input" placeholder="Publisher name" />
              </div>
              <div>
                <label className="label">Publication Date</label>
                <input type="date" value={form.publication_date} onChange={(e) => setForm({ ...form, publication_date: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Pages</label>
                <input type="number" value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} className="input" placeholder="Number of pages" min="0" />
              </div>
              <div>
                <label className="label">File Size</label>
                <input value={form.file_size} onChange={(e) => setForm({ ...form, file_size: e.target.value })} className="input" placeholder="e.g. 12.4 MB" />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing */}
          <div className="mb-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-400">Pricing</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Price (BDT) *</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" min="0" />
              </div>
              <div>
                <label className="label">Discount Price (BDT)</label>
                <input type="number" value={form.discount_price ?? ''} onChange={(e) => setForm({ ...form, discount_price: e.target.value ? Number(e.target.value) : null })} className="input" min="0" />
              </div>
            </div>
          </div>

          {/* Section 4: Book Files */}
          <div className="mb-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-400">Book Files</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FileUploadZone
                  label="Cover Image *"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  currentUrl={form.cover_url}
                  onUpload={handleCoverUpload}
                  onClear={() => setForm({ ...form, cover_url: '' })}
                  uploading={coverUpload.uploading}
                  progress={coverUpload.progress}
                  error={coverUpload.error}
                  preview
                  maxSize="10MB"
                  icon={Image}
                />
              </div>
              <div>
                <FileUploadZone
                  label="Preview PDF (Optional)"
                  accept="application/pdf"
                  currentUrl={form.preview_url}
                  onUpload={handlePreviewUpload}
                  onClear={() => setForm({ ...form, preview_url: '' })}
                  uploading={previewUpload.uploading}
                  progress={previewUpload.progress}
                  error={previewUpload.error}
                  maxSize="100MB"
                  icon={FileText}
                />
              </div>
              <div className="lg:col-span-2">
                <FileUploadZone
                  label="Full PDF *"
                  accept="application/pdf"
                  currentUrl={form.file_url}
                  onUpload={handlePdfUpload}
                  onClear={() => setForm({ ...form, file_url: '' })}
                  uploading={pdfUpload.uploading}
                  progress={pdfUpload.progress}
                  error={pdfUpload.error}
                  maxSize="100MB"
                  icon={FileText}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Full Description */}
          <div className="mb-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-400">Full Description</h3>
            <div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input resize-none" placeholder="Detailed book description..." />
            </div>
          </div>

          {/* Section 6: Status & Visibility */}
          <div className="mb-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-400">Status & Visibility</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Book Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookForm['status'] })} className="input">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ToggleSwitch label="Featured" checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
                <ToggleSwitch label="Bestseller" checked={form.is_bestseller} onChange={(v) => setForm({ ...form, is_bestseller: v })} />
                <ToggleSwitch label="New Arrival" checked={form.is_new_arrival} onChange={(v) => setForm({ ...form, is_new_arrival: v })} />
              </div>
            </div>
          </div>

          {/* System Statistics (Read-only, shown only when editing) */}
          {editing && (
            <div className="mb-6 rounded-xl border border-ink-200 bg-ink-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-400">System Statistics (Read-only)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-white p-3 text-center">
                  <BookOpen className="mx-auto h-5 w-5 text-ink-400" />
                  <p className="mt-1 text-2xl font-bold text-ink-900">{editing.view_count || 0}</p>
                  <p className="text-xs text-ink-500">Views</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <Download className="mx-auto h-5 w-5 text-ink-400" />
                  <p className="mt-1 text-2xl font-bold text-ink-900">{editing.download_count || 0}</p>
                  <p className="text-xs text-ink-500">Downloads</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <Star className="mx-auto h-5 w-5 text-amber-500" />
                  <p className="mt-1 text-2xl font-bold text-ink-900">{editing.rating.toFixed(1)}</p>
                  <p className="text-xs text-ink-500">Rating</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <span className="text-lg font-bold text-emerald-600">{editing.sales_count}</span>
                  <p className="mt-1 text-xs text-ink-500">Sales</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-400">
                Statistics are calculated automatically. Contact support if data appears incorrect.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2 border-t border-ink-100 pt-4">
          <button onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
          <button onClick={save} disabled={saving || coverUpload.uploading || previewUpload.uploading || pdfUpload.uploading} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {editing ? 'Update' : 'Create'} Book
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Book?" size="sm">
        <p className="text-sm text-ink-600">Are you sure you want to delete this book? This action cannot be undone.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={confirmDelete} className="btn-danger flex-1"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </Modal>
    </div>
  );
}
