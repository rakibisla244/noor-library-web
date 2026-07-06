import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Download, FileText, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatBDT, formatDateTime } from '../../lib/types';
import type { Order, OrderItem } from '../../lib/types';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const viewDetails = async (order: Order) => {
    setViewOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setItems((data as OrderItem[]) || []);
  };

  const downloadInvoice = (order: Order) => {
    const content = `
NOOR LIBRARY — INVOICE
======================
Order: ${order.order_number}
Date: ${formatDateTime(order.created_at)}
Customer: ${order.customer_name}
Email: ${order.customer_email}
Phone: ${order.customer_phone}
Payment: ${order.payment_method} (${order.payment_status})

Items:
${items.map((i) => `- ${i.book_title} x${i.quantity} = ${formatBDT(Number(i.price) * i.quantity)}`).join('\n')}

Subtotal: ${formatBDT(Number(order.subtotal))}
Discount: ${formatBDT(Number(order.discount))}
Total: ${formatBDT(Number(order.total))}

Thank you for your purchase!
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.order_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paymentStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
      case 'pending_verification':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"><Clock className="h-3 w-3" /> Pending Verification</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><XCircle className="h-3 w-3" /> Rejected</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><AlertCircle className="h-3 w-3" /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{status}</span>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Payment History</h1>
        <p className="mt-1 text-sm text-ink-500">All your orders and payment records.</p>
      </div>

      {loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No orders yet"
          description="Your payment history will appear here after your first purchase."
          action={<Link to="/shop" className="btn-primary">Browse Books</Link>}
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink-900">{o.order_number}</p>
                  {paymentStatusBadge(o.payment_status)}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                  <Calendar className="h-3.5 w-3.5" /> {formatDateTime(o.created_at)} • {o.payment_method}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-ink-900">{formatBDT(Number(o.total))}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => viewDetails(o)} className="btn-outline py-2 px-3 text-xs sm:px-4">
                    <FileText className="h-3.5 w-3.5" /> View
                  </button>
                  {o.payment_status === 'approved' && (
                    <button onClick={() => downloadInvoice(o)} className="btn-ghost py-2 px-3 text-xs sm:px-4">
                      <Download className="h-3.5 w-3.5" /> Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.order_number || ''}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            {viewOrder.payment_status === 'pending_verification' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Payment Pending Verification</span>
                </div>
                <p className="mt-1 text-sm text-amber-600">
                  Your payment is being reviewed. You will be able to download your books once the payment is approved (usually within 24 hours).
                </p>
              </div>
            )}

            {viewOrder.payment_status === 'rejected' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Payment Rejected</span>
                </div>
                <p className="mt-1 text-sm text-red-600">
                  Your payment could not be verified. Please contact support if you believe this is an error.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-ink-50 p-4 text-sm">
              <div>
                <p className="text-ink-500">Date</p>
                <p className="font-semibold text-ink-900">{formatDateTime(viewOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-ink-500">Payment Method</p>
                <p className="font-semibold capitalize text-ink-900">{viewOrder.payment_method}</p>
              </div>
              <div>
                <p className="text-ink-500">Customer</p>
                <p className="font-semibold text-ink-900">{viewOrder.customer_name}</p>
              </div>
              <div>
                <p className="text-ink-500">Email</p>
                <p className="font-semibold text-ink-900">{viewOrder.customer_email}</p>
              </div>
              <div>
                <p className="text-ink-500">Sender Mobile</p>
                <p className="font-semibold text-ink-900">{viewOrder.sender_mobile || '—'}</p>
              </div>
              <div>
                <p className="text-ink-500">Transaction ID</p>
                <p className="font-semibold text-ink-900">{viewOrder.txn_id || '—'}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-ink-900">Items</h4>
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3">
                    <img src={i.book_cover} alt={i.book_title} className="h-14 w-10 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-900">{i.book_title}</p>
                      <p className="text-xs text-ink-500">Qty: {i.quantity}</p>
                    </div>
                    <p className="font-bold text-ink-900">{formatBDT(Number(i.price) * i.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="font-semibold">{formatBDT(Number(viewOrder.subtotal))}</span></div>
              {Number(viewOrder.discount) > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Discount {viewOrder.coupon_code ? `(${viewOrder.coupon_code})` : ''}</span><span className="font-semibold">-{formatBDT(Number(viewOrder.discount))}</span></div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-2 text-lg"><span className="font-bold">Total</span><span className="font-bold text-emerald-700">{formatBDT(Number(viewOrder.total))}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
