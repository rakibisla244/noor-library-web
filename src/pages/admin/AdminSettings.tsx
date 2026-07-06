import { useEffect, useState } from 'react';
import { Save, Loader2, Store, Phone, CreditCard, Globe, RotateCcw, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const DEFAULTS: Record<string, string> = {
  site_name: 'Noor Library',
  site_tagline: 'Premium Islamic eBooks',
  hero_title: 'Authentic Islamic Knowledge, Delivered Instantly',
  hero_subtitle: 'Discover a curated collection of authentic Islamic eBooks.',
  contact_email: 'hello@noorlibrary.com',
  contact_phone: '+880 1919-100514',
  address: 'Dhaka, Bangladesh',
  bkash_number: '01700-000000',
  nagad_number: '01700-000000',
  rocket_number: '01700-000000',
  facebook_url: 'https://facebook.com/noorlibrary',
  youtube_url: 'https://youtube.com/@noorlibrary',
  footer_about: 'Noor Library is Bangladesh\'s premier marketplace for authentic Islamic eBooks.',
  stat_ebooks_value: '500+',
  stat_ebooks_label: 'eBooks Available',
  stat_readers_value: '10K+',
  stat_readers_label: 'Happy Readers',
  stat_downloads_value: '50K+',
  stat_downloads_label: 'Downloads',
  stat_rating_value: '4.8',
  stat_rating_label: 'Avg. Rating',
};

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*');
      const map: Record<string, string> = { ...DEFAULTS };
      (data || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(updates);
    if (error) toast(error.message, 'error');
    else toast('Settings saved successfully', 'success');
    setSaving(false);
  };

  const groups = [
    { icon: Store, title: 'Site Information', keys: ['site_name', 'site_tagline', 'hero_title', 'hero_subtitle', 'footer_about'] },
    { icon: Phone, title: 'Contact Information', keys: ['contact_email', 'contact_phone', 'address'] },
    { icon: CreditCard, title: 'Payment Numbers', keys: ['bkash_number', 'nagad_number', 'rocket_number'] },
    { icon: Globe, title: 'Social Media', keys: ['facebook_url', 'youtube_url'] },
    { icon: BarChart3, title: 'Homepage Statistics', keys: ['stat_ebooks_value', 'stat_ebooks_label', 'stat_readers_value', 'stat_readers_label', 'stat_downloads_value', 'stat_downloads_label', 'stat_rating_value', 'stat_rating_label'] },
  ];

  const labels: Record<string, string> = {
    site_name: 'Site Name',
    site_tagline: 'Site Tagline',
    hero_title: 'Hero Title',
    hero_subtitle: 'Hero Subtitle',
    footer_about: 'Footer About Text',
    contact_email: 'Contact Email',
    contact_phone: 'Contact Phone',
    address: 'Address',
    bkash_number: 'bKash Number',
    nagad_number: 'Nagad Number',
    rocket_number: 'Rocket Number',
    facebook_url: 'Facebook URL',
    youtube_url: 'YouTube URL',
    stat_ebooks_value: 'eBooks Value (e.g., 500+)',
    stat_ebooks_label: 'eBooks Label',
    stat_readers_value: 'Happy Readers Value (e.g., 10K+)',
    stat_readers_label: 'Happy Readers Label',
    stat_downloads_value: 'Downloads Value (e.g., 50K+)',
    stat_downloads_label: 'Downloads Label',
    stat_rating_value: 'Avg. Rating Value (e.g., 4.8)',
    stat_rating_label: 'Avg. Rating Label',
  };

  const resetToDefaults = () => {
    setSettings(DEFAULTS);
    toast('Settings reset to defaults. Click Save to apply.', 'info');
  };

  if (loading) return <div className="h-96 skeleton rounded-2xl" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Settings</h1>
          <p className="mt-1 text-sm text-ink-500">Manage your site configuration.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetToDefaults} className="btn border border-ink-200 bg-white text-ink-700 hover:bg-ink-50">
            <RotateCcw className="h-4 w-4" /> Reset to Default
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.title} className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <g.icon className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-ink-900">{g.title}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.keys.map((key) => (
                <div key={key} className={key === 'hero_subtitle' || key === 'footer_about' ? 'sm:col-span-2' : ''}>
                  <label className="label">{labels[key] || key}</label>
                  {key === 'footer_about' || key === 'hero_subtitle' ? (
                    <textarea
                      value={settings[key] || ''}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      rows={3}
                      className="input resize-none"
                    />
                  ) : (
                    <input
                      value={settings[key] || ''}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      className="input"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
