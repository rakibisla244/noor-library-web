import { useEffect, useState } from 'react';
import { Search, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, BookOpen, User, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Order, OrderItem } from '../../lib/types';
import { formatBDT, formatDateTime } from '../../lib/types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewDetails = async (order: Order) => {
    setViewOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setItems((data as OrderItem[]) || []);
  };

  const updateStatus = async (order: Order, field: 'payment_status' | 'order_status', value: string) => {
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', order.id);
    if (error) toast(error.message, 'error');
    else { toast('Order updated', 'success'); load(); setViewOrder({ ...order, [field]: value }); }
  };

  const approvePayment = async (order: Order) => {
    const { error } = await supabase.from('orders')
      .update({ payment_status: 'approved', order_status: 'completed' })
      .eq('id', order.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Payment approved! Customer can now download.', 'success');
      load();
      setViewOrder({ ...order, payment_status: 'approved', order_status: 'completed' });
    }
  };

  const rejectPayment = async (order: Order) => {
    const { error } = await supabase.from('orders')
      .update({ payment_status: 'rejected', order_status: 'cancelled' })
      .eq('id', order.id);
    if (error) toast(error.message, 'error');
    else { toast('Payment rejected.', 'error'); load(); setViewOrder({ ...order, payment_status: 'rejected', order_status: 'cancelled' }); }
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.customer_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paymentStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'pending_verification': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const orderStatusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'processing': return 'bg-teal-100 text-teal-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const pendingOrders = orders.filter(o => o.payment_status === 'pending_verification');

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Orders Management</h1>
          <p className="mt-1 text-sm text-ink-500">{orders.length} total orders.</p>
        </div>
        {pendingOrders.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{pendingOrders.length}</span> pending verification
          </div>
        )}
      </div>

      {/* Pending Orders Section */}
      {pendingOrders.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-amber-800">Orders Awaiting Verification</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingOrders.map((order) => (
              <div key={order.id} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-ink-900">{order.order_number}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(order.created_at)}</p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                    <Clock className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-ink-400" />
                    <span className="text-ink-700">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-ink-400" />
                    <span className="font-bold text-emerald-700">{formatBDT(Number(order.total))}</span>
                    <span className="text-xs text-ink-500">via {order.payment_method}</span>
                  </div>
                  <div className="rounded-lg bg-amber-100 px-2 py-1.5 text-xs text-ink-600">
                    <strong>Txn:</strong> {order.txn_id} | <strong>Sender:</strong> {order.sender_mobile}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approvePayment(order)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => rejectPayment(order)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => viewDetails(order)}
                    className="flex items-center justify-center rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-ink-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="all">All Status</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">No orders found.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="p-4 font-semibold">Order #</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Method</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold">Order</th>
                <th className="p-4 text-right font-semibold">Total</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((o) => (
                <tr key={o.id} className={`hover:bg-ink-50/50 ${o.payment_status === 'pending_verification' ? 'bg-amber-50/30' : ''}`}>
                  <td className="p-4 font-semibold text-ink-900">{o.order_number}</td>
                  <td className="p-4">
                    <p className="text-ink-900">{o.customer_name}</p>
                    <p className="text-xs text-ink-500">{o.customer_email}</p>
                  </td>
                  <td className="p-4 text-ink-500">{formatDateTime(o.created_at)}</td>
                  <td className="p-4 capitalize text-ink-700">{o.payment_method}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColor(o.payment_status)}`}>
                      {o.payment_status === 'pending_verification' && <Clock className="mr-1 h-3 w-3" />}
                      {o.payment_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusColor(o.order_status)}`}>
                      {o.order_status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-ink-900">{formatBDT(Number(o.total))}</td>
                  <td className="p-4">
                    <div className="flex justify-end">
                      <button onClick={() => viewDetails(o)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><FileText className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.order_number || ''}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            {viewOrder.payment_status === 'pending_verification' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Payment Verification Required</span>
                </div>
                <p className="mt-1 text-sm text-amber-600">
                  Customer sent {formatBDT(Number(viewOrder.total))} via {viewOrder.payment_method}. Verify payment and approve or reject.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approvePayment(viewOrder)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Payment
                  </button>
                  <button
                    onClick={() => rejectPayment(viewOrder)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" /> Reject Payment
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-ink-50 p-4 text-sm">
              <div><p className="text-ink-500">Date</p><p className="font-semibold text-ink-900">{formatDateTime(viewOrder.created_at)}</p></div>
              <div><p className="text-ink-500">Payment Method</p><p className="font-semibold capitalize text-ink-900">{viewOrder.payment_method}</p></div>
              <div><p className="text-ink-500">Customer</p><p className="font-semibold text-ink-900">{viewOrder.customer_name}</p></div>
              <div><p className="text-ink-500">Email</p><p className="font-semibold text-ink-900">{viewOrder.customer_email}</p></div>
              <div><p className="text-ink-500">Phone</p><p className="font-semibold text-ink-900">{viewOrder.customer_phone}</p></div>
              <div><p className="text-ink-500">Sender Mobile</p><p className="font-semibold text-ink-900">{viewOrder.sender_mobile || '—'}</p></div>
              <div><p className="text-ink-500">Transaction ID</p><p className="font-semibold text-ink-900">{viewOrder.txn_id || '—'}</p></div>
              <div><p className="text-ink-500">Payment Number</p><p className="font-semibold text-ink-900">{viewOrder.payment_number || '01985270188'}</p></div>
              <div><p className="text-ink-500">Amount</p><p className="font-bold text-emerald-700">{formatBDT(Number(viewOrder.total))}</p></div>
              <div><p className="text-ink-500">Verification</p><p className="font-semibold text-ink-900">{viewOrder.payment_status === 'approved' ? 'Approved' : viewOrder.payment_status === 'rejected' ? 'Rejected' : 'Pending'}</p></div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-ink-900">Items</h4>
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3">
                    <img src={i.book_cover} alt={i.book_title} className="h-14 w-10 rounded object-cover" />
                    <div className="flex-1"><p className="text-sm font-semibold text-ink-900">{i.book_title}</p><p className="text-xs text-ink-500">Qty: {i.quantity}</p></div>
                    <p className="font-bold text-ink-900">{formatBDT(Number(i.price) * i.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="font-semibold">{formatBDT(Number(viewOrder.subtotal))}</span></div>
              {Number(viewOrder.discount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span className="font-semibold">-{formatBDT(Number(viewOrder.discount))}</span></div>}
              <div className="flex justify-between border-t border-ink-100 pt-2 text-lg"><span className="font-bold">Total</span><span className="font-bold text-emerald-700">{formatBDT(Number(viewOrder.total))}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-ink-100 pt-4">
              <div>
                <label className="label">Payment Status</label>
                <select value={viewOrder.payment_status} onChange={(e) => updateStatus(viewOrder, 'payment_status', e.target.value)} className="input">
                  <option value="pending">Pending</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="label">Order Status</label>
                <select value={viewOrder.order_status} onChange={(e) => updateStatus(viewOrder, 'order_status', e.target.value)} className="input">
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
