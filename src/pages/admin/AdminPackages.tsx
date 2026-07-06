import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Save, Loader2, Upload, X, Image, Package, ToggleLeft, ToggleRight, BookOpen, Star, Check, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Book, BookPackage, Category, BookLanguage } from '../../lib/types';
import { formatBDT, packageOriginalPrice, packageSavingsPercent } from '../../lib/types';
import { uploadPackageImage, uploadPreviewPdf, formatFileSize } from '../../lib/uploads';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

type PackageForm = {
  name: string;
  slug: string;
  description: string;
  cover_url: string;
  price: number;
  original_price: number | null;
  is_active: boolean;
  author: string;
  language: BookLanguage;
  category_id: string;
  features: string[];
  tags: string[];
  islamic_topic: string;
  page_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
};

type UploadState = {
  uploading: boolean;
  progress: number;
  error: string | null;
};

type PreviewPdfItem = {
  id?: string;
  title: string;
  file_url: string;
  file_size: string;
};

const emptyPackage: PackageForm = {
  name: '',
  slug: '',
  description: '',
  cover_url: '',
  price: 0,
  original_price: null,
  is_active: true,
  author: '',
  language: 'Bangla',
  category_id: '',
  features: [],
  tags: [],
  islamic_topic: '',
  page_count: 0,
  is_featured: false,
  is_bestseller: false,
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function AdminPackages() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<(BookPackage & { book_count: number; gallery_count: number })[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Inline book selection inside the modal
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [bookSearch, setBookSearch] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<PackageForm>(emptyPackage);
  const [coverUploadState, setCoverUploadState] = useState<UploadState>({ uploading: false, progress: 0, error: null });

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryUploadStates, setGalleryUploadStates] = useState<UploadState[]>([]);

  const [previewPdfs, setPreviewPdfs] = useState<PreviewPdfItem[]>([]);
  const [previewUploadStates, setPreviewUploadStates] = useState<UploadState[]>([]);

  const [newFeature, setNewFeature] = useState('');
  const [newTag, setNewTag] = useState('');

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: itemsData } = await supabase
        .from('package_items')
        .select('package_id');

      const bookCounts = (itemsData || []).reduce((acc, item) => {
        acc[item.package_id] = (acc[item.package_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const { data: galleryData } = await supabase
        .from('package_gallery_images')
        .select('package_id');

      const galleryCounts = (galleryData || []).reduce((acc, item) => {
        acc[item.package_id] = (acc[item.package_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pkgsWithCount = (data || []).map(pkg => ({
        ...pkg,
        book_count: bookCounts[pkg.id] || 0,
        gallery_count: galleryCounts[pkg.id] || 0,
      }));

      setPackages(pkgsWithCount);
    } catch (err) {
      toast('Failed to load packages', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadBooks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, slug, author, price, discount_price, cover_url, status, pages')
        .eq('status', 'published')
        .order('title');

      if (error) throw error;
      setBooks(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadPackages();
    loadBooks();
    loadCategories();
  }, [loadPackages, loadBooks, loadCategories]);

  const resetForm = () => {
    setForm(emptyPackage);
    setEditingId(null);
    setGalleryImages([]);
    setGalleryUploadStates([]);
    setPreviewPdfs([]);
    setPreviewUploadStates([]);
    setCoverUploadState({ uploading: false, progress: 0, error: null });
    setSelectedBooks([]);
    setBookSearch('');
    setNewFeature('');
    setNewTag('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = async (pkg: BookPackage) => {
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description || '',
      cover_url: pkg.cover_url || '',
      price: pkg.price,
      original_price: pkg.original_price,
      is_active: pkg.is_active,
      author: pkg.author || '',
      language: (pkg.language as BookLanguage) || 'Bangla',
      category_id: pkg.category_id || '',
      features: pkg.features || [],
      tags: pkg.tags || [],
      islamic_topic: pkg.islamic_topic || '',
      page_count: pkg.page_count || 0,
      is_featured: pkg.is_featured || false,
      is_bestseller: pkg.is_bestseller || false,
    });
    setEditingId(pkg.id);
    setShowModal(true);
    setBookSearch('');

    // Load gallery images
    const { data: galleryData } = await supabase
      .from('package_gallery_images')
      .select('image_url, display_order')
      .eq('package_id', pkg.id)
      .order('display_order');

    if (galleryData) {
      setGalleryImages(galleryData.map(g => g.image_url));
    }

    // Load preview PDFs
    const { data: previewData } = await supabase
      .from('package_previews')
      .select('id, title, file_url, file_size, display_order')
      .eq('package_id', pkg.id)
      .order('display_order');

    if (previewData) {
      setPreviewPdfs(previewData.map(p => ({
        id: p.id,
        title: p.title,
        file_url: p.file_url,
        file_size: p.file_size,
      })));
    }

    // Load currently selected books for this package
    const { data: pkgItems } = await supabase
      .from('package_items')
      .select('book_id')
      .eq('package_id', pkg.id);

    setSelectedBooks((pkgItems || []).map(i => i.book_id));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Package name is required', 'error'); return; }
    if (!form.slug.trim()) { toast('Slug is required', 'error'); return; }
    if (form.price < 0) { toast('Price cannot be negative', 'error'); return; }

    setSaving(true);
    try {
      const slug = form.slug.trim() || generateSlug(form.name);

      // Auto-calculate page count from selected books
      const totalPages = books
        .filter(b => selectedBooks.includes(b.id))
        .reduce((sum, b) => sum + (b.pages || 0), 0);

      const packageData = {
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        cover_url: form.cover_url.trim() || null,
        price: form.price,
        original_price: form.original_price || null,
        is_active: form.is_active,
        author: form.author.trim() || null,
        language: form.language,
        category_id: form.category_id || null,
        features: form.features,
        tags: form.tags,
        islamic_topic: form.islamic_topic.trim() || null,
        page_count: totalPages || form.page_count || 0,
        is_featured: form.is_featured,
        is_bestseller: form.is_bestseller,
      };

      let packageId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('book_packages')
          .update(packageData)
          .eq('id', editingId);

        if (error) throw error;
        await updateGalleryImages(editingId);
        await updatePreviewPdfs(editingId);
        await updatePackageBooks(editingId);
        toast('Package updated successfully', 'success');
      } else {
        const { data: newPackage, error } = await supabase
          .from('book_packages')
          .insert(packageData)
          .select('id')
          .single();

        if (error) throw error;

        if (newPackage) {
          packageId = newPackage.id;
          await updateGalleryImages(newPackage.id);
          await updatePreviewPdfs(newPackage.id);
          await updatePackageBooks(newPackage.id);
        }

        toast('Package created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      loadPackages();
    } catch (err: any) {
      if (err.code === '23505') {
        toast('A package with this slug already exists', 'error');
      } else {
        toast('Failed to save package', 'error');
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updatePackageBooks = async (packageId: string) => {
    await supabase.from('package_items').delete().eq('package_id', packageId);

    if (selectedBooks.length > 0) {
      const { error } = await supabase
        .from('package_items')
        .insert(selectedBooks.map(bookId => ({ package_id: packageId, book_id: bookId })));

      if (error) {
        console.error('Failed to save package books:', error);
        toast('Package saved but failed to link books. Please try editing again.', 'error');
      }
    }
  };

  const updateGalleryImages = async (packageId: string) => {
    await supabase.from('package_gallery_images').delete().eq('package_id', packageId);

    if (galleryImages.length > 0) {
      const { error } = await supabase
        .from('package_gallery_images')
        .insert(galleryImages.map((url, index) => ({
          package_id: packageId,
          image_url: url,
          display_order: index,
        })));

      if (error) console.error('Failed to save gallery images:', error);
    }
  };

  const updatePreviewPdfs = async (packageId: string) => {
    await supabase.from('package_previews').delete().eq('package_id', packageId);

    const validPreviews = previewPdfs.filter(p => p.file_url);
    if (validPreviews.length > 0) {
      const { error } = await supabase
        .from('package_previews')
        .insert(validPreviews.map((preview, index) => ({
          package_id: packageId,
          title: preview.title,
          file_url: preview.file_url,
          file_size: preview.file_size,
          display_order: index,
        })));

      if (error) console.error('Failed to save preview PDFs:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('book_packages').delete().eq('id', id);
      if (error) throw error;
      toast('Package deleted successfully', 'success');
      loadPackages();
    } catch (err) {
      toast('Failed to delete package', 'error');
      console.error(err);
    }
  };

  const handleToggleActive = async (pkg: BookPackage) => {
    try {
      const { error } = await supabase
        .from('book_packages')
        .update({ is_active: !pkg.is_active })
        .eq('id', pkg.id);

      if (error) throw error;
      toast(pkg.is_active ? 'Package deactivated' : 'Package activated', 'success');
      loadPackages();
    } catch (err) {
      toast('Failed to update package', 'error');
      console.error(err);
    }
  };

  const handleToggleBook = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploadState({ uploading: true, progress: 0, error: null });
    try {
      const result = await uploadPackageImage(file);
      if (result.error) throw new Error(result.error);
      setForm(f => ({ ...f, cover_url: result.url }));
      setCoverUploadState({ uploading: false, progress: 100, error: null });
    } catch (err: any) {
      setCoverUploadState({ uploading: false, progress: 0, error: err.message || 'Upload failed' });
      toast('Failed to upload cover image', 'error');
    }
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUploadStates(prev => {
      const s = [...prev];
      s[index] = { uploading: true, progress: 0, error: null };
      return s;
    });

    try {
      const result = await uploadPreviewPdf(file);

      if (result.error) throw new Error(result.error);

      setPreviewPdfs(prev => {
        const s = [...prev];
        if (s[index]) s[index] = { ...s[index], file_url: result.url, file_size: formatFileSize(file.size) };
        return s;
      });

      setPreviewUploadStates(prev => {
        const s = [...prev];
        s[index] = { uploading: false, progress: 100, error: null };
        return s;
      });

      toast('Preview PDF uploaded', 'success');
    } catch (err: any) {
      setPreviewUploadStates(prev => {
        const s = [...prev];
        s[index] = { uploading: false, progress: 0, error: err.message };
        return s;
      });
      toast('Failed to upload preview PDF', 'error');
    }
  };

  const addPreviewPdfSlot = () => {
    setPreviewPdfs(prev => [...prev, { title: `Preview ${prev.length + 1}`, file_url: '', file_size: '' }]);
    setPreviewUploadStates(prev => [...prev, { uploading: false, progress: 0, error: null }]);
  };

  const removePreviewPdf = (index: number) => {
    setPreviewPdfs(prev => prev.filter((_, i) => i !== index));
    setPreviewUploadStates(prev => prev.filter((_, i) => i !== index));
  };

  const updatePreviewTitle = (index: number, title: string) => {
    setPreviewPdfs(prev => {
      const s = [...prev];
      if (s[index]) s[index] = { ...s[index], title };
      return s;
    });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadIndex = index !== undefined ? index : galleryImages.length;
    setGalleryUploadStates(prev => {
      const s = [...prev];
      s[uploadIndex] = { uploading: true, progress: 0, error: null };
      return s;
    });

    try {
      const result = await uploadPackageImage(file);

      if (result.error) throw new Error(result.error);

      setGalleryImages(prev => {
        if (index !== undefined) {
          const s = [...prev];
          s[index] = result.url;
          return s;
        }
        return [...prev, result.url];
      });

      setGalleryUploadStates(prev => {
        const s = [...prev];
        s[uploadIndex] = { uploading: false, progress: 100, error: null };
        return s;
      });
    } catch (err: any) {
      setGalleryUploadStates(prev => {
        const s = [...prev];
        s[uploadIndex] = { uploading: false, progress: 0, error: err.message };
        return s;
      });
      toast('Failed to upload image', 'error');
    }
  };

  const addGallerySlot = () => {
    setGalleryImages(prev => [...prev, '']);
    setGalleryUploadStates(prev => [...prev, { uploading: false, progress: 0, error: null }]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryUploadStates(prev => prev.filter((_, i) => i !== index));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setForm(f => ({ ...f, tags: f.tags.filter((_, i) => i !== index) }));
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    book.author.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const selectedBooksData = books.filter(b => selectedBooks.includes(b.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Book Packages</h1>
          <p className="text-sm text-ink-500">Create and manage book bundle packages</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="h-4 w-4" />
          Create Package
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="rounded-xl border border-ink-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">No packages yet</h3>
          <p className="mt-1 text-sm text-ink-500">Create your first book package bundle.</p>
          <button onClick={openCreateModal} className="btn-primary mt-4">
            <Plus className="h-4 w-4" />
            Create Package
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`group relative overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg ${
                pkg.is_active ? 'border-ink-200' : 'border-amber-300 bg-amber-50/50'
              }`}
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1">
                {pkg.is_featured && <Badge variant="success" className="text-xs">Featured</Badge>}
                {pkg.is_bestseller && <Badge variant="warning" className="text-xs">Bestseller</Badge>}
                {!pkg.is_active && <Badge variant="warning">Inactive</Badge>}
              </div>

              <div className="flex gap-4 p-4">
                <div className="shrink-0">
                  {pkg.cover_url ? (
                    <img src={pkg.cover_url} alt={pkg.name} className="h-24 w-20 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-emerald-100">
                      <Package className="h-10 w-10 text-emerald-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="line-clamp-1 font-semibold text-ink-900">{pkg.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{pkg.book_count} {pkg.book_count === 1 ? 'book' : 'books'}</span>
                    {pkg.gallery_count > 0 && (
                      <>
                        <span className="text-ink-300">•</span>
                        <Image className="h-3.5 w-3.5" />
                        <span>{pkg.gallery_count} images</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-700">{formatBDT(pkg.price)}</span>
                    {pkg.original_price && pkg.original_price > pkg.price && (
                      <>
                        <span className="text-sm text-ink-400 line-through">{formatBDT(pkg.original_price)}</span>
                        <span className="text-xs font-medium text-emerald-600">
                          {packageSavingsPercent({ ...pkg, books: [] })}% off
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex border-t border-ink-100 bg-ink-50">
                <button
                  onClick={() => openEditModal(pkg)}
                  className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-100"
                >
                  <Edit className="h-4 w-4" />
                  Edit Package
                </button>
                <div className="flex border-l border-ink-100">
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className="flex items-center justify-center px-2.5 text-ink-500 transition hover:bg-ink-100"
                    title={pkg.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {pkg.is_active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-ink-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="flex items-center justify-center px-2.5 text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Package' : 'Create Package'}
        size="xl"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Package Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editingId ? f.slug : (f.slug || generateSlug(name)),
                  }));
                }}
                className="input"
                placeholder="e.g., Ramadan Collection"
              />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="input"
                placeholder="ramadan-collection"
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="Package description..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Author/Creator</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className="input"
                placeholder="Package author"
              />
            </div>
            <div>
              <label className="label">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as BookLanguage }))}
                className="input"
              >
                <option value="Bangla">Bangla</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Urdu">Urdu</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="input"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Islamic Topic</label>
              <input
                type="text"
                value={form.islamic_topic}
                onChange={(e) => setForm((f) => ({ ...f, islamic_topic: e.target.value }))}
                className="input"
                placeholder="e.g., Prayer, Fasting"
              />
            </div>
            <div>
              <label className="label">Total Pages</label>
              <input
                type="number"
                value={form.page_count}
                onChange={(e) => setForm((f) => ({ ...f, page_count: parseInt(e.target.value) || 0 }))}
                className="input"
                placeholder="Auto-calculated from books"
              />
              <p className="mt-1 text-xs text-ink-400">Auto-calculated when books are selected</p>
            </div>
          </div>

          {/* ─── Included Books ─── */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">Included Books</h3>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  {selectedBooks.length} selected
                </span>
              </div>
              {selectedBooks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBooks([])}
                  className="text-xs text-ink-500 hover:text-red-600"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected books summary */}
            {selectedBooksData.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedBooksData.map((book) => (
                  <span
                    key={book.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 pl-1.5 pr-2 py-1 text-xs font-medium text-emerald-800"
                  >
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="h-4 w-3 rounded object-cover"
                    />
                    <span className="max-w-[120px] truncate">{book.title}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleBook(book.id)}
                      className="ml-0.5 text-emerald-600 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search + book list */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search books to add..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="input w-full pl-9 py-2 text-sm"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-emerald-200 bg-white p-2">
              {filteredBooks.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-400">
                  {bookSearch ? 'No books match your search.' : 'No published books available.'}
                </p>
              ) : (
                filteredBooks.map((book) => {
                  const isSelected = selectedBooks.includes(book.id);
                  const effectivePrice = book.discount_price && book.discount_price < book.price
                    ? book.discount_price : book.price;

                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleToggleBook(book.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-transparent hover:border-ink-200 hover:bg-ink-50'
                      }`}
                    >
                      <div
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                          isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-300 bg-white'
                        }`}
                        style={{ minWidth: '1.125rem', minHeight: '1.125rem' }}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="h-10 w-8 shrink-0 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 text-sm font-medium text-ink-900">{book.title}</p>
                        <p className="text-xs text-ink-500">{book.author} • {book.pages} pages</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-emerald-700">{formatBDT(effectivePrice)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="label">Package Features/Benefits</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.features.map((feature, index) => (
                <span key={index} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  <Check className="h-3 w-3" />
                  {feature}
                  <button onClick={() => removeFeature(index)} className="ml-1 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="input flex-1"
                placeholder="e.g., Instant Access, Lifetime Download"
              />
              <button type="button" onClick={addFeature} className="btn-outline">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-600">
                  #{tag}
                  <button onClick={() => removeTag(index)} className="ml-1 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="input flex-1"
                placeholder="e.g., ramadan, quran, hadith"
              />
              <button type="button" onClick={addTag} className="btn-outline">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="label">Cover Image</label>
            <div className="flex items-start gap-4">
              {form.cover_url && (
                <div className="relative">
                  <img
                    src={form.cover_url}
                    alt="Cover"
                    className="h-28 w-24 rounded-lg object-cover border border-ink-200"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, cover_url: '' }))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <label className="btn-outline cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload Cover
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                  disabled={coverUploadState.uploading}
                />
              </label>
            </div>
            {coverUploadState.uploading && (
              <div className="mt-2">
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${coverUploadState.progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-500">Uploading... {coverUploadState.progress}%</p>
              </div>
            )}
            {coverUploadState.error && <p className="mt-1 text-xs text-red-500">{coverUploadState.error}</p>}
          </div>

          {/* Gallery Images */}
          <div>
            <label className="label">Gallery Images</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative">
                  {url ? (
                    <img src={url} alt={`Gallery ${index + 1}`} className="h-28 w-full rounded-lg object-cover border border-ink-200" />
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 w-full rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 cursor-pointer hover:bg-ink-100">
                      {galleryUploadStates[index]?.uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="h-6 w-6 text-ink-400" />
                      )}
                      <span className="mt-1 text-xs text-ink-500">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleGalleryUpload(e, index)}
                        className="hidden"
                        disabled={galleryUploadStates[index]?.uploading}
                      />
                    </label>
                  )}
                  {url && (
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addGallerySlot}
                className="flex flex-col items-center justify-center h-28 w-full rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <Plus className="h-6 w-6 text-emerald-600" />
                <span className="mt-1 text-xs text-emerald-600">Add Image</span>
              </button>
            </div>
          </div>

          {/* Preview PDFs */}
          <div>
            <label className="label">Preview PDFs</label>
            <p className="text-xs text-ink-500 mb-3">
              Add free preview PDFs customers can read before purchasing.
            </p>
            <div className="space-y-3">
              {previewPdfs.map((preview, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 bg-ink-50/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={preview.title}
                      onChange={(e) => updatePreviewTitle(index, e.target.value)}
                      className="input py-1.5 text-sm"
                      placeholder="e.g., Book 1 Preview"
                    />
                    {preview.file_url && (
                      <div className="flex items-center gap-2 text-xs text-ink-500">
                        <span className="text-emerald-600 font-medium">Uploaded</span>
                        <span>•</span>
                        <span>{preview.file_size}</span>
                        <a href={preview.file_url} target="_blank" rel="noreferrer" className="text-emerald-600 underline hover:text-emerald-700">View</a>
                      </div>
                    )}
                    {previewUploadStates[index]?.uploading && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${previewUploadStates[index].progress}%` }} />
                        </div>
                        <span className="text-xs text-ink-500">{previewUploadStates[index].progress}%</span>
                      </div>
                    )}
                    {previewUploadStates[index]?.error && <p className="text-xs text-red-500">{previewUploadStates[index].error}</p>}
                  </div>
                  {preview.file_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPdfs(prev => { const s = [...prev]; s[index] = { ...s[index], file_url: '', file_size: '' }; return s; })}
                      className="btn-outline py-1.5 px-3 text-xs"
                    >
                      Replace
                    </button>
                  ) : (
                    <label className="btn-outline cursor-pointer py-1.5 px-3 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handlePreviewUpload(e, index)}
                        className="hidden"
                        disabled={previewUploadStates[index]?.uploading}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => removePreviewPdf(index)}
                    className="text-ink-400 transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPreviewPdfSlot}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 transition"
              >
                <Plus className="h-4 w-4" />
                Add Preview PDF
              </button>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Package Price (৳) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="input"
                min="0"
                step="1"
              />
            </div>
            <div>
              <label className="label">Original Price (৳)</label>
              <input
                type="number"
                value={form.original_price || ''}
                onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value ? parseFloat(e.target.value) : null }))}
                className="input"
                min="0"
                step="1"
                placeholder="Leave empty to calculate from books"
              />
              <p className="mt-1 text-xs text-ink-400">Used to show savings percentage</p>
            </div>
          </div>

          {/* Flags */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_active" className="text-sm text-ink-700">Active (available for purchase)</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                className="h-4 w-4 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_featured" className="text-sm text-ink-700">Featured Package</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_bestseller"
                checked={form.is_bestseller}
                onChange={(e) => setForm((f) => ({ ...f, is_bestseller: e.target.checked }))}
                className="h-4 w-4 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_bestseller" className="text-sm text-ink-700">Bestseller Package</label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> {editingId ? 'Update Package' : 'Create Package'}</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
