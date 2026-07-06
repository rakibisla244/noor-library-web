import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, Clock, CheckCircle2, Copy, Check, AlertTriangle, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { drainAdminEmailQueue } from '../lib/supabase';
import { formatBDT, effectivePrice, packageEffectivePrice, DEFAULT_PAYMENT_NUMBER } from '../lib/types';
import type { Order, PaymentMethodSettings } from '../lib/types';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface PaymentDetails {
  senderMobile: string;
  txnId: string;
}

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast('Please sign in to purchase eBooks.', 'info');
      navigate('/login', { state: { from: '/checkout', purchase: true }, replace: true });
    }
  }, [user, navigate, toast]);
  const [step, setStep] = useState<'customer' | 'payment' | 'review'>('customer');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<PaymentMethodSettings[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
  });
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    senderMobile: '',
    txnId: '',
  });
  const [processing, setProcessing] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = total - discount;

  // Fetch enabled payment methods on mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingMethods(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Failed to load payment methods:', error);
      } else if (data && data.length > 0) {
        const methods = data as PaymentMethodSettings[];
        setEnabledPaymentMethods(methods);
        setPaymentMethod(methods[0].id); // Select first enabled method by default
      }
      setLoadingMethods(false);
    };
    fetchPaymentMethods();
  }, []);

  // Get current payment method settings
  const currentMethod = enabledPaymentMethods.find(m => m.id === paymentMethod);
  const currentPaymentNumber = currentMethod?.account_number || DEFAULT_PAYMENT_NUMBER;
  const currentAccountType = currentMethod?.account_type || 'Personal';

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();
    if (error || !data) {
      toast('Invalid or expired coupon code', 'error');
      return;
    }
    const coupon = data as { code: string; type: string; value: number; min_order: number; valid_from: string; valid_until: string };
    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      toast('Coupon has expired', 'error');
      return;
    }
    if (total < coupon.min_order) {
      toast(`Minimum order ${formatBDT(coupon.min_order)} required`, 'error');
      return;
    }
    const discountValue = coupon.type === 'percentage' ? Math.round(total * (coupon.value / 100)) : coupon.value;
    setAppliedCoupon({ code: coupon.code, discount: discountValue });
    toast(`Coupon applied! You save ${formatBDT(discountValue)}`, 'success');
  };

  const placeOrder = async () => {
    if (!user) return;
    if (!paymentDetails.senderMobile || !paymentDetails.txnId) {
      toast('Please enter sender mobile and transaction ID', 'error');
      return;
    }
    if (!paymentMethod || enabledPaymentMethods.length === 0) {
      toast('No payment method available', 'error');
      return;
    }
    setProcessing(true);

    const orderNumber = `NL-${Date.now().toString().slice(-8)}`;
    const orderData = {
      user_id: user.id,
      order_number: orderNumber,
      subtotal: total,
      discount,
      total: finalTotal,
      coupon_code: appliedCoupon?.code || null,
      payment_method: paymentMethod,
      payment_status: 'pending_verification' as const,
      order_status: 'pending' as const,
      txn_id: paymentDetails.txnId,
      sender_mobile: paymentDetails.senderMobile,
      payment_number: currentPaymentNumber,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
    };

    const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select().single();
    if (orderError) {
      toast(orderError.message, 'error');
      setProcessing(false);
      return;
    }

    // Insert order items
    const orderItems = items.map((item) => {
      if (item.isPackage && item.package) {
        return {
          order_id: (order as Order).id,
          book_id: null,
          package_id: item.package.id,
          is_package: true,
          book_title: item.package.name,
          book_cover: item.package.cover_url || '',
          price: packageEffectivePrice(item.package),
          quantity: item.quantity,
        };
      }
      return {
        order_id: (order as Order).id,
        book_id: item.book!.id,
        package_id: null,
        is_package: false,
        book_title: item.book!.title,
        book_cover: item.book!.cover_url,
        price: effectivePrice(item.book!),
        quantity: item.quantity,
      };
    });
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      toast(itemsError.message, 'error');
      setProcessing(false);
      return;
    }

    // Increment sales count for each book/package
    await Promise.all(items.map((item) => {
      if (item.isPackage && item.package) {
        // For packages, we'll increment sales for all included books
        return supabase
          .from('package_items')
          .select('book_id')
          .eq('package_id', item.package.id)
          .then(({ data }) => {
            if (data && data.length > 0) {
              return Promise.all(
                data.map(pi =>
                  supabase.rpc('increment_sales', { book_id: pi.book_id, qty: item.quantity }).then(() => {}, () => {})
                )
              );
            }
          });
      }
      return supabase.rpc('increment_sales', { book_id: item.book!.id, qty: item.quantity }).then(() => {}, () => {});
    }));

    // Increment coupon usage
    if (appliedCoupon) {
      await supabase.rpc('increment_coupon', { coupon_code: appliedCoupon.code }).then(() => {}, () => {});
    }

    // Create admin notification for pending payment
    await supabase.from('notifications').insert({
      type: 'payment_pending',
      title: 'New Payment Verification Request',
      message: `Order ${orderNumber} from ${customer.name} - ${formatBDT(finalTotal)} via ${paymentMethod}`,
      data: {
        order_number: orderNumber,
        customer_name: customer.name,
        customer_email: customer.email,
        amount: finalTotal,
        payment_method: paymentMethod,
      },
      order_id: (order as Order).id,
      user_id: user.id,
    }).then(() => {}, () => {});

    // Trigger admin email dispatch (fire-and-forget)
    drainAdminEmailQueue();

    setSuccessOrder(order as Order);
    clear();
    setProcessing(false);
  };

  if (items.length === 0 && !successOrder) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg text-center">
          <Shield className="mx-auto h-16 w-16 text-ink-300" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">Your cart is empty</h1>
          <p className="mt-2 text-ink-500">Add some books before proceeding to checkout.</p>
          <Link to="/shop" className="btn-primary mt-6">Browse Books</Link>
        </div>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 animate-scale-in">
            <Clock className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink-900">Order Submitted!</h1>
          <p className="mt-2 text-ink-500">Your payment is pending verification. We will review and approve your payment within 30 minutes.</p>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> After approval, your purchased PDF will be available in your Dashboard → Purchased Books section for download.
            </p>
          </div>

          <div className="card mt-6 p-6 text-left">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <span className="text-sm text-ink-500">Order Number</span>
              <span className="font-bold text-ink-900">{successOrder.order_number}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 py-4">
              <span className="text-sm text-ink-500">Amount</span>
              <span className="font-bold text-emerald-700">{formatBDT(Number(successOrder.total))}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 py-4">
              <span className="text-sm text-ink-500">Payment Method</span>
              <span className="font-semibold capitalize text-ink-900">{successOrder.payment_method}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 py-4">
              <span className="text-sm text-ink-500">Sent to</span>
              <span className="font-semibold text-ink-900">{successOrder.payment_number || DEFAULT_PAYMENT_NUMBER}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 py-4">
              <span className="text-sm text-ink-500">Sender Mobile</span>
              <span className="font-semibold text-ink-900">{successOrder.sender_mobile}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink-100 py-4">
              <span className="text-sm text-ink-500">Transaction ID</span>
              <span className="font-semibold text-ink-900">{successOrder.txn_id}</span>
            </div>
            <div className="flex items-center justify-between py-4">
              <span className="text-sm text-ink-500">Status</span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">Pending Verification</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-left">
            <p className="text-sm text-emerald-800">
              <strong>What happens next?</strong><br />
              1. Our team will verify your payment within 30 minutes.<br />
              2. Once approved, you will receive an email notification.<br />
              3. Download your PDF from Dashboard → Purchased Books.
            </p>
          </div>

          <div className="mt-6">
            <Link to={`/dashboard/purchased-books?tab=pending&orderId=${successOrder.id}`} className="btn-primary w-full">Download</Link>
            <p className="mt-2 text-center text-xs text-ink-500">View your purchased books and download status.</p>
          </div>

          <div className="mt-4">
            <Link to="/shop" className="btn-outline w-full">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Customer Info', key: 'customer' as const },
    { num: 2, label: 'Payment', key: 'payment' as const },
    { num: 3, label: 'Review', key: 'review' as const },
  ];

  return (
    <div className="container-page py-8">
      {/* Steps */}
      <div className="mx-auto mb-8 flex max-w-2xl justify-center">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold sm:h-10 sm:w-10 ${
                step === s.key ? 'bg-emerald-700 text-white' : step > s.num - 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-400'
              }`}>
                {step > s.num - 1 ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : s.num}
              </div>
              <span className={`mt-1 text-[10px] font-medium sm:text-xs ${step === s.key ? 'text-emerald-700' : 'text-ink-400'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 w-8 sm:mx-4 sm:w-12 ${step > s.num - 1 ? 'bg-emerald-200' : 'bg-ink-100'}`} />}
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          {/* Step 1: Customer Info */}
          {step === 'customer' && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-ink-900">Customer Information</h2>
              <p className="mt-1 text-sm text-ink-500">Enter your contact details for order updates.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="input"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="input"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="input"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep('payment')}
                disabled={!customer.name || !customer.email || !customer.phone}
                className="btn-primary mt-6 w-full"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-ink-900">Select Payment Method</h2>
              <p className="mt-1 text-sm text-ink-500">Choose a mobile payment option and complete the transfer.</p>

              {loadingMethods ? (
                <div className="mt-6 h-32 skeleton rounded-xl" />
              ) : enabledPaymentMethods.length === 0 ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                  <p className="mt-2 font-semibold text-red-700">No payment methods available</p>
                  <p className="mt-1 text-sm text-red-600">Please contact the administrator.</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {enabledPaymentMethods.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`rounded-xl border-2 p-4 text-center transition ${
                          paymentMethod === m.id ? 'border-emerald-500 bg-emerald-50' : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                      >
                        <div className="text-2xl font-bold" style={{ color: m.color }}>{m.logo}</div>
                        <p className="mt-1 text-sm font-semibold text-ink-900">{m.name}</p>
                      </button>
                    ))}
                  </div>

                  {/* Payment Number Display Box */}
                  <div className="mt-6 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-700">Send exact amount to this {currentMethod?.name} number:</p>
                      <div className="mt-3 flex items-center justify-center gap-3">
                        <span className="text-xl font-extrabold text-emerald-800 tracking-wide break-all sm:text-3xl">{currentPaymentNumber}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(currentPaymentNumber); toast('Number copied!', 'success'); }}
                          className="rounded-lg bg-emerald-600 p-2.5 text-white transition hover:bg-emerald-700"
                          title="Copy number"
                        >
                          <Copy className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-3 text-base font-semibold text-emerald-700">Amount: {formatBDT(finalTotal)}</p>
                      <p className="mt-1 text-sm text-emerald-600">Account Type: {currentAccountType}</p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 p-4">
                    <p className="text-sm font-semibold text-ink-800">After sending the money:</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-ink-600">
                      <li>Enter your Sender Mobile Number (the number you sent money from)</li>
                      <li>Enter the Transaction ID from the payment confirmation</li>
                      <li>Click Review Order to complete your purchase</li>
                    </ol>
                  </div>

                  {/* Warning */}
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Your order will not be approved until payment is verified by the admin. Please ensure you send the exact amount and keep your transaction ID safe.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="label">Sender Mobile Number</label>
                      <input
                        type="tel"
                        value={paymentDetails.senderMobile}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, senderMobile: e.target.value })}
                        className="input"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="label">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentDetails.txnId}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, txnId: e.target.value })}
                    className="input"
                    placeholder="Enter transaction ID from payment confirmation"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep('customer')} className="btn-outline flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  disabled={!paymentDetails.senderMobile || !paymentDetails.txnId || enabledPaymentMethods.length === 0}
                  className="btn-primary flex-1"
                >
                  Review Order
                </button>
              </div>
              </>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-ink-900">Review Your Order</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                  <h3 className="text-sm font-semibold text-ink-700">Customer Details</h3>
                  <p className="mt-1 text-sm text-ink-600">{customer.name} ({customer.email})</p>
                  <p className="text-sm text-ink-600">{customer.phone}</p>
                </div>

                <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                  <h3 className="text-sm font-semibold text-ink-700">Payment Details</h3>
                  <p className="mt-1 text-sm text-ink-600 capitalize">Method: {currentMethod?.name || paymentMethod}</p>
                  <p className="text-sm text-ink-600">Sent to: {currentPaymentNumber} ({currentAccountType})</p>
                  <p className="text-sm text-ink-600">Sender: {paymentDetails.senderMobile}</p>
                  <p className="text-sm text-ink-600">Txn ID: {paymentDetails.txnId}</p>
                </div>

                <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                  <h3 className="text-sm font-semibold text-ink-700">Items ({items.length})</h3>
                  <div className="mt-2 space-y-2">
                    {items.map((item) => {
                      const isPkg = item.isPackage && item.package;
                      const title = isPkg ? item.package!.name : item.book!.title;
                      const cover = isPkg ? item.package!.cover_url : item.book!.cover_url;
                      const price = isPkg
                        ? packageEffectivePrice(item.package!)
                        : effectivePrice(item.book!);

                      return (
                        <div key={isPkg ? `pkg-${item.package!.id}` : item.book!.id} className="flex items-center gap-3">
                          {cover ? (
                            <img src={cover} alt={title} className="h-10 w-8 rounded object-cover" />
                          ) : (
                            <div className="flex h-10 w-8 items-center justify-center rounded bg-emerald-100 text-emerald-600">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-ink-900">{title}</p>
                            <p className="text-xs text-ink-500">
                              {isPkg ? 'Package' : item.book!.author} • Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-ink-900">{formatBDT(price * item.quantity)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep('payment')} className="btn-outline flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={placeOrder}
                  disabled={processing}
                  className="btn-primary flex-1"
                >
                  {processing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Shield className="h-4 w-4" /> Place Order</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 p-6">
            <h3 className="text-lg font-bold text-ink-900">Order Summary</h3>

            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const isPkg = item.isPackage && item.package;
                const title = isPkg ? item.package!.name : item.book!.title;
                const cover = isPkg ? item.package!.cover_url : item.book!.cover_url;
                const price = isPkg
                  ? packageEffectivePrice(item.package!)
                  : effectivePrice(item.book!);

                return (
                  <div
                    key={isPkg ? `pkg-${item.package!.id}` : item.book!.id}
                    className="flex items-center gap-3"
                  >
                    {cover ? (
                      <img src={cover} alt={title} className="h-12 w-9 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-9 items-center justify-center rounded bg-emerald-100 text-emerald-600">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{ title}</p>
                      <p className="text-xs text-ink-500">
                        {isPkg ? 'Package' : ''} • Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-ink-900">{formatBDT(price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="mt-4 border-t border-ink-100 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="input flex-1"
                />
                <button onClick={applyCoupon} className="btn-outline">Apply</button>
              </div>
              {appliedCoupon && (
                <div className="mt-2 flex items-center justify-between text-sm text-emerald-600">
                  <span>Coupon applied</span>
                  <span>-{formatBDT(discount)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal</span>
                <span>{formatBDT(total)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatBDT(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
                <span>Total</span>
                <span>{formatBDT(finalTotal)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
