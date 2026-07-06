import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Security() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ current: '', new: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new !== form.confirm) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (form.new.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: form.new });
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Password updated successfully', 'success');
      setForm({ current: '', new: '', confirm: '' });
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Security Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Manage your password and account security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-ink-900">Change Password</h2>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  type={show ? 'text' : 'password'}
                  value={form.new}
                  onChange={(e) => setForm({ ...form, new: e.target.value })}
                  className="input pl-10 pr-10"
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  type={show ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="input pl-10"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-ink-900">Account Security</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Account Protected</p>
                <p className="text-xs text-emerald-700">Your account is secured with row-level security policies.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-ink-100 p-4">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Encrypted Data</p>
                <p className="text-xs text-ink-500">All your data is encrypted in transit and at rest.</p>
              </div>
            </div>
            <div className="rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-semibold text-ink-900">Account ID</p>
              <p className="mt-1 break-all text-xs text-ink-500">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
