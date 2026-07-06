import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, Loader2, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Coupon } from '../../lib/types';
import { formatBDT, formatDate } from '../../lib/types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

const empty = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 10,
  min_order: 0,
  max_uses: 100,
  valid_until: '',
  is_active: true,
};

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data as Coupon[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: Number(c.value),
      min_order: Number(c.min_order),
      max_uses: c.max_uses,
      valid_until: c.valid_until ? c.valid_until.split('T')[0] : '',
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code) { toast('Coupon code is required', 'error'); return; }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order),
      max_uses: Number(form.max_uses),
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editing.id);
      if (error) toast(error.message, 'error'); else toast('Coupon updated', 'success');
    } else {
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) toast(error.message, 'error'); else toast('Coupon created', 'success');
    }
    setSaving(false); setModalOpen(false); load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('coupons').delete().eq('id', deleteId);
    if (error) toast(error.message, 'error'); else toast('Coupon deleted', 'success');
    setDeleteId(null); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Coupons</h1>
          <p className="mt-1 text-sm text-ink-500">{coupons.length} coupons.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> Add Coupon</button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}</div>
      ) : coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" description="Create discount coupons for your customers." action={<button onClick={openNew} className="btn-primary">Add Coupon</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="relative bg-gradient-to-br from-emerald-700 to-emerald-900 p-5 text-white">
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full border-4 border-dashed border-white/20" />
                <div className="flex items-center justify-between">
                  <Ticket className="h-6 w-6 text-gold-400" />
                  <Badge variant={c.is_active ? 'emerald' : 'gray'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold tracking-wider">{c.code}</p>
                <p className="mt-1 text-sm text-emerald-100">
                  {c.type === 'percentage' ? `${c.value}% off` : `${formatBDT(Number(c.value))} off`}
                </p>
              </div>
              <div className="p-4 text-sm">
                <div className="flex justify-between"><span className="text-ink-500">Min order</span><span className="font-semibold">{formatBDT(Number(c.min_order))}</span></div>
                <div className="flex justify-between"><span className="text-ink-500">Used</span><span className="font-semibold">{c.used_count} / {c.max_uses}</span></div>
                {c.valid_until && <div className="flex justify-between"><span className="text-ink-500">Valid until</span><span className="font-semibold">{formatDate(c.valid_until)}</span></div>}
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <button onClick={() => openEdit(c)} className="btn-outline flex-1 py-2 text-sm"><Edit className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => setDeleteId(c.id)} className="btn-outline py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'}>
        <div className="space-y-4">
          <div>
            <label className="label">Coupon Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input uppercase" placeholder="NOOR10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })} className="input">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="label">{form.type === 'percentage' ? 'Percentage (%)' : 'Amount (BDT)'}</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Order (BDT)</label>
              <input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">Max Uses</label>
              <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Valid Until</label>
            <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-ink-300 text-emerald-600" /> Active</label>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Coupon?" size="sm">
        <p className="text-sm text-ink-600">Are you sure you want to delete this coupon?</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={confirmDelete} className="btn-danger flex-1"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </Modal>
    </div>
  );
}
