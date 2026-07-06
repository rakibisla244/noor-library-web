import { useEffect, useState } from 'react';
import { Search, FileText, UserCog, Ban, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  order_count?: number;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewUser, setViewUser] = useState<AdminProfile | null>(null);

  const load = async () => {
    setLoading(true);
    // Profiles + auth.users email via a join-less approach: fetch profiles, then emails from auth is not accessible.
    // We'll use the user_id and show profile info; email comes from the admin's session for their own.
    // For a proper admin view, we use a SECURITY DEFINER function.
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      // Fallback: just profiles
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers((profiles as AdminProfile[]) || []);
    } else {
      setUsers((data as AdminProfile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (user: AdminProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    if (error) toast(error.message, 'error');
    else { toast(`User is now ${newRole}`, 'success'); load(); setViewUser({ ...user, role: newRole }); }
  };

  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Users Management</h1>
        <p className="mt-1 text-sm text-ink-500">{users.length} registered users.</p>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="input pl-10" />
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt="Avatar"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {(u.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-ink-900">{u.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-ink-700">{u.email || '—'}</td>
                  <td className="p-4 text-ink-700">{u.phone || '—'}</td>
                  <td className="p-4"><Badge variant={u.role === 'admin' ? 'gold' : 'gray'}>{u.role}</Badge></td>
                  <td className="p-4 text-ink-500">{formatDate(u.created_at)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setViewUser(u)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><FileText className="h-4 w-4" /></button>
                      <button onClick={() => toggleRole(u)} className="rounded-lg p-2 text-gold-600 hover:bg-gold-50" title="Toggle admin"><UserCog className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Details">
        {viewUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewUser.avatar_url ? (
                <img
                  src={viewUser.avatar_url}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                  {(viewUser.full_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-ink-900">{viewUser.full_name}</p>
                <Badge variant={viewUser.role === 'admin' ? 'gold' : 'gray'}>{viewUser.role}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-ink-50 p-4 text-sm">
              <div><p className="text-ink-500">Email</p><p className="font-semibold text-ink-900">{viewUser.email || '—'}</p></div>
              <div><p className="text-ink-500">Phone</p><p className="font-semibold text-ink-900">{viewUser.phone || '—'}</p></div>
              <div><p className="text-ink-500">User ID</p><p className="font-mono text-xs text-ink-700">{viewUser.id}</p></div>
              <div><p className="text-ink-500">Joined</p><p className="font-semibold text-ink-900">{formatDate(viewUser.created_at)}</p></div>
            </div>
            <button onClick={() => toggleRole(viewUser)} className="btn-outline w-full">
              {viewUser.role === 'admin' ? <><Ban className="h-4 w-4" /> Remove Admin</> : <><CheckCircle2 className="h-4 w-4" /> Make Admin</>}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
