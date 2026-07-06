import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Search, AlertTriangle, User, Mail, Phone, CreditCard, Hash, DollarSign, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Order } from '../../lib/types';
import { formatBDT, formatDateTime } from '../../lib/types';
import Modal from '../../components/ui/Modal';

export default function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending_verification')
      .order('created_at', { ascending: false });
    setPayments((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approvePayment = async (order: Order) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'approved', order_status: 'completed' })
      .eq('id', order.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      // Create notification for approved payment
      await supabase.from('notifications').insert({
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `Order ${order.order_number} - ${order.customer_name} payment approved. Customer can now download.`,
        data: { order_number: order.order_number, customer_name: order.customer_name },
        order_id: order.id,
        user_id: order.user_id,
      }).then(() => {}, () => {});
      toast(`Payment approved! ${order.customer_name} can now download their books.`, 'success');
      load();
      setViewOrder(null);
    }
  };

  const rejectPayment = async (order: Order) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'rejected', order_status: 'cancelled' })
      .eq('id', order.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      // Create notification for rejected payment
      await supabase.from('notifications').insert({
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: `Order ${order.order_number} - ${order.customer_name} payment rejected.`,
        data: { order_number: order.order_number, customer_name: order.customer_name },
        order_id: order.id,
        user_id: order.user_id,
      }).then(() => {}, () => {});
      toast(`Payment rejected for order ${order.order_number}.`, 'error');
      load();
      setViewOrder(null);
    }
  };

  const filtered = payments.filter((o) =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
    o.txn_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Payment Verification</h1>
            <p className="mt-1 text-sm text-ink-500">
              Review and approve manual payments (bKash, Nagad, Rocket)
            </p>
          </div>
          {payments.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{payments.length}</span> pending
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, customer, or txn ID..."
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-32 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">All Caught Up!</h3>
          <p className="mt-2 text-sm text-ink-500">
            {search ? 'No payments match your search.' : 'No payments pending verification.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="card border-l-4 border-l-amber-400 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-700">
                      {order.order_number}
                    </span>
                    <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 capitalize">
                      {order.payment_method}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-2 text-ink-600">
                      <User className="h-4 w-4 text-ink-400" />
                      <span>{order.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-600">
                      <Mail className="h-4 w-4 text-ink-400" />
                      <span className="truncate">{order.customer_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-600">
                      <Hash className="h-4 w-4 text-ink-400" />
                      <span>TXN: {order.txn_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-600">
                      <Calendar className="h-4 w-4 text-ink-400" />
                      <span>{formatDateTime(order.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Amount</p>
                    <p className="text-xl font-bold text-emerald-700">{formatBDT(Number(order.total))}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewOrder(order)}
                      className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                    >
                      <FileText className="h-4 w-4" /> Details
                    </button>
                    <button
                      onClick={() => approvePayment(order)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectPayment(order)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Verify Payment - ${viewOrder?.order_number || ''}`}
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-6">
            {/* Alert */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Payment Verification Required</span>
              </div>
              <p className="mt-2 text-sm text-amber-600">
                Customer claims to have sent <strong>{formatBDT(Number(viewOrder.total))}</strong> via{' '}
                <strong className="capitalize">{viewOrder.payment_method}</strong>. Verify the payment in your account
                and approve or reject.
              </p>
            </div>

            {/* Payment Details */}
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <h4 className="mb-3 font-semibold text-ink-900">Payment Details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Amount</p>
                    <p className="text-lg font-bold text-emerald-700">{formatBDT(Number(viewOrder.total))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <CreditCard className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Payment Method</p>
                    <p className="font-semibold capitalize text-ink-900">{viewOrder.payment_method}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Hash className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Transaction ID</p>
                    <p className="font-mono font-semibold text-ink-900">{viewOrder.txn_id || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100">
                    <Phone className="h-5 w-5 text-ink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Sender Mobile</p>
                    <p className="font-semibold text-ink-900">{viewOrder.sender_mobile || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <h4 className="mb-3 font-semibold text-ink-900">Customer Information</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-ink-500">Name</p>
                  <p className="font-semibold text-ink-900">{viewOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Email</p>
                  <p className="font-semibold text-ink-900">{viewOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Phone</p>
                  <p className="font-semibold text-ink-900">{viewOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Order Date</p>
                  <p className="font-semibold text-ink-900">{formatDateTime(viewOrder.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => approvePayment(viewOrder)}
                className="btn-primary flex-1 py-3"
              >
                <CheckCircle2 className="h-5 w-5" /> Approve Payment
              </button>
              <button
                onClick={() => rejectPayment(viewOrder)}
                className="btn-outline border-red-200 text-red-600 hover:bg-red-50 flex-1 py-3"
              >
                <XCircle className="h-5 w-5" /> Reject Payment
              </button>
            </div>

            {/* Note */}
            <p className="text-center text-xs text-ink-500">
              Approved: customer gets download access. Rejected: order cancelled, no download access.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
