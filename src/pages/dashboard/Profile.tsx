import { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Save, Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { uploadAvatar } from '../../lib/uploads';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast('Please select a valid image file (JPG, PNG, or WEBP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Image size must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    const result = await uploadAvatar(file, user.id);

    if (result.error) {
      toast(result.error, 'error');
      setUploading(false);
      return;
    }

    const { error } = await updateProfile({ avatar_url: result.url });
    if (error) {
      toast(error, 'error');
    } else {
      setAvatarUrl(result.url);
      await refreshProfile();
      toast('Avatar updated successfully', 'success');
    }
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setUploading(true);
    const { error } = await updateProfile({ avatar_url: '' });
    if (error) {
      toast(error, 'error');
    } else {
      setAvatarUrl('');
      await refreshProfile();
      toast('Avatar removed successfully', 'success');
    }
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile({
      full_name: form.full_name,
      phone: form.phone,
    });
    if (error) {
      toast(error, 'error');
    } else {
      toast('Profile updated successfully', 'success');
      await refreshProfile();
    }
    setSaving(false);
  };

  const getInitials = () => {
    return (profile?.full_name || user?.email || 'U').charAt(0).toUpperCase();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Manage your personal information.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="card p-6 text-center">
          <div className="relative mx-auto inline-block">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
                {getInitials()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-outline flex items-center gap-2"
            >
              <Upload className="h-4 w-4" /> Upload Photo
            </button>
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="text-sm text-red-600 hover:underline"
              >
                Remove Photo
              </button>
            )}
          </div>

          <p className="mt-4 font-semibold text-ink-900">{profile?.full_name || 'User'}</p>
          <p className="text-sm text-ink-500">{user?.email}</p>
          <span className="badge mt-3 bg-emerald-100 text-emerald-700 capitalize">{profile?.role || 'user'}</span>
          <p className="mt-4 text-xs text-ink-500">Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-ink-900">Edit Profile</h2>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={user?.email || ''}
                  disabled
                  className="input pl-10 bg-ink-50 text-ink-500"
                />
              </div>
              <p className="mt-1 text-xs text-ink-400">Email cannot be changed.</p>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input pl-10"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
