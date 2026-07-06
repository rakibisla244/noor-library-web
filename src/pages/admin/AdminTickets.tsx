import { useEffect, useState } from 'react';
import { MessageSquare, Search, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../lib/types';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
}

export default function AdminTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied' | 'closed'>('all');
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) toast(error.message, 'error');
    else setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: 'pending' | 'replied' | 'closed') => {
    setUpdating(true);
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Ticket marked as ${status}`, 'success');
      load();
      if (viewTicket?.id === id) setViewTicket({ ...viewTicket, status });
    }
    setUpdating(false);
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast('Ticket deleted', 'success');
      load();
      setViewTicket(null);
    }
  };

  const filtered = tickets.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="gold">Pending</Badge>;
      case 'replied':
        return <Badge variant="emerald">Replied</Badge>;
      case 'closed':
        return <Badge variant="gray">Closed</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const tabs = ['all', 'pending', 'replied', 'closed'] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Support Tickets</h1>
        <p className="mt-1 text-sm text-ink-500">Manage customer support requests.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                filter === t
                  ? 'bg-emerald-700 text-white'
                  : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              {t}
              {t === 'pending' && tickets.filter((x) => x.status === 'pending').length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
                  {tickets.filter((x) => x.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No tickets found"
          description={filter === 'all' ? 'No support tickets yet.' : `No ${filter} tickets.`}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => setViewTicket(t)}
              className="card cursor-pointer p-4 transition hover:border-emerald-200 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {statusBadge(t.status)}
                    <span className="text-sm text-ink-400">{formatDateTime(t.created_at)}</span>
                  </div>
                  <h3 className="mt-1 font-semibold text-ink-900 truncate">{t.subject}</h3>
                  <p className="text-sm text-ink-500">
                    {t.name} ({t.email})
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTicket(t.id);
                  }}
                  className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewTicket} onClose={() => setViewTicket(null)} title="Ticket Details">
        {viewTicket && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {statusBadge(viewTicket.status)}
              <span className="text-xs text-ink-400">{formatDateTime(viewTicket.created_at)}</span>
            </div>

            <div>
              <p className="text-sm text-ink-500">From</p>
              <p className="font-semibold text-ink-900">{viewTicket.name}</p>
              <p className="text-sm text-ink-600">{viewTicket.email}</p>
            </div>

            <div>
              <p className="text-sm text-ink-500">Subject</p>
              <p className="font-semibold text-ink-900">{viewTicket.subject}</p>
            </div>

            <div>
              <p className="text-sm text-ink-500">Message</p>
              <div className="mt-1 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
                {viewTicket.message}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => updateStatus(viewTicket.id, 'pending')}
                disabled={updating || viewTicket.status === 'pending'}
                className="btn-outline flex-1"
              >
                <Clock className="h-4 w-4" /> Pending
              </button>
              <button
                onClick={() => updateStatus(viewTicket.id, 'replied')}
                disabled={updating || viewTicket.status === 'replied'}
                className="btn-outline flex-1"
              >
                <CheckCircle className="h-4 w-4" /> Replied
              </button>
              <button
                onClick={() => updateStatus(viewTicket.id, 'closed')}
                disabled={updating || viewTicket.status === 'closed'}
                className="btn-outline flex-1"
              >
                <XCircle className="h-4 w-4" /> Closed
              </button>
            </div>

            <button
              onClick={() => deleteTicket(viewTicket.id)}
              className="btn-outline w-full text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete Ticket
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
