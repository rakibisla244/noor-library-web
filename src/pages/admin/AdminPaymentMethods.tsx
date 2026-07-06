import { useEffect, useState } from 'react';
import { Save, AlertCircle, Check, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { PaymentMethodSettings } from '../../lib/types';

export default function AdminPaymentMethods() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethodSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast('Failed to load payment methods', 'error');
    } else {
      setMethods((data as PaymentMethodSettings[]) || []);
    }
    setLoading(false);
  };

  const updateMethod = (id: string, field: keyof PaymentMethodSettings, value: string | boolean) => {
    setMethods(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const saveAll = async () => {
    setSaving(true);

    // Validate: enabled methods must have account number
    const invalidMethods = methods.filter(m => m.is_enabled && !m.account_number.trim());
    if (invalidMethods.length > 0) {
      toast(`${invalidMethods.map(m => m.name).join(', ')} must have an account number when enabled`, 'error');
      setSaving(false);
      return;
    }

    // Update each method
    for (const method of methods) {
      const { error } = await supabase
        .from('payment_methods')
        .update({
          is_enabled: method.is_enabled,
          account_number: method.account_number,
          account_type: method.account_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', method.id);

      if (error) {
        toast(`Failed to update ${method.name}: ${error.message}`, 'error');
        setSaving(false);
        return;
      }
    }

    toast('Payment methods saved successfully!', 'success');
    setSaving(false);
  };

  const hasWarnings = methods.some(m => m.is_enabled && !m.account_number.trim());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Payment Methods</h1>
            <p className="mt-1 text-sm text-ink-500">Configure mobile payment options for checkout.</p>
          </div>
        </div>
        <div className="card divide-y divide-ink-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6"><div className="h-20 skeleton rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Payment Methods</h1>
          <p className="mt-1 text-sm text-ink-500">Configure mobile payment options for checkout. Only enabled methods will appear on the checkout page.</p>
        </div>
        <button onClick={saveAll} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </button>
      </div>

      {/* Warning for enabled methods without account number */}
      {hasWarnings && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Missing Account Numbers</p>
            <p className="mt-1 text-sm text-amber-700">
              The following enabled payment methods are missing account numbers and will not work correctly:
              {methods.filter(m => m.is_enabled && !m.account_number.trim()).map(m => ` ${m.name}`).join(',')}
            </p>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink-100">
        {methods.map(method => (
          <div key={method.id} className="p-6">
            <div className="flex items-start justify-between gap-6">
              {/* Left: Toggle + Info */}
              <div className="flex-1 space-y-4">
                {/* Header with toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: method.color }}>
                      {method.logo}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-ink-900">{method.name}</h3>
                      <p className="text-xs text-ink-500">Payment Method</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => updateMethod(method.id, 'is_enabled', !method.is_enabled)}
                    className={`relative h-7 w-14 rounded-full transition-colors ${
                      method.is_enabled ? 'bg-emerald-500' : 'bg-ink-300'
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        method.is_enabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {method.is_enabled ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                      <Check className="mr-1 h-3.5 w-3.5" /> Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-sm font-medium text-ink-500">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Account Number & Type - only show if enabled */}
                {method.is_enabled && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Account Number</label>
                      <input
                        type="text"
                        value={method.account_number}
                        onChange={(e) => updateMethod(method.id, 'account_number', e.target.value)}
                        className={`input ${
                          !method.account_number.trim() ? 'border-amber-300 focus:border-amber-500' : ''
                        }`}
                        placeholder="01XXXXXXXXX"
                      />
                      {!method.account_number.trim() && (
                        <p className="mt-1 text-xs text-amber-600">Account number is required when enabled</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Account Type</label>
                      <select
                        value={method.account_type}
                        onChange={(e) => updateMethod(method.id, 'account_type', e.target.value as 'Personal' | 'Agent' | 'Merchant')}
                        className="input"
                      >
                        <option value="Personal">Personal</option>
                        <option value="Agent">Agent</option>
                        <option value="Merchant">Merchant</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Section */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-ink-900">Checkout Preview</h3>
        <p className="mt-1 text-sm text-ink-500">This is how the payment section will appear to customers.</p>

        <div className="mt-6 rounded-xl border-2 border-dashed border-ink-200 p-6">
          <p className="text-sm font-semibold text-ink-700">Select Payment Method</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {methods.filter(m => m.is_enabled).map(method => (
              <div
                key={method.id}
                className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 text-center"
              >
                <div className="text-2xl font-bold" style={{ color: method.color }}>
                  {method.logo}
                </div>
                <p className="mt-1 text-sm font-semibold text-ink-900">{method.name}</p>
                {method.account_number && (
                  <p className="mt-1 text-xs text-ink-500">{method.account_number}</p>
                )}
              </div>
            ))}
          </div>

          {methods.filter(m => m.is_enabled).length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-amber-500" />
              <p className="mt-2 text-sm text-amber-700">No payment methods enabled. Enable at least one method for customers to checkout.</p>
            </div>
          )}

          {methods.filter(m => m.is_enabled).length > 0 && methods.filter(m => m.is_enabled)[0] && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm text-emerald-700">
                Customers will send payment to: <strong>{methods.find(m => m.is_enabled)?.account_number || 'Not configured'}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
