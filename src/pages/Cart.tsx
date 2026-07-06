import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, X, Package, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatBDT, effectivePrice, packageEffectivePrice, packageSavings } from '../lib/types';
import EmptyState from '../components/ui/EmptyState';

export default function Cart() {
  const { items, remove, updateQty, total, clear } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setChecking(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) {
      toast('Invalid or expired coupon code', 'error');
      setAppliedCoupon(null);
    } else {
      const coupon = data as { code: string; type: string; value: number; min_order: number };
      if (total < coupon.min_order) {
        toast(`Minimum order of ${formatBDT(coupon.min_order)} required`, 'error');
        setAppliedCoupon(null);
      } else {
        const discount = coupon.type === 'percentage' ? (total * coupon.value) / 100 : coupon.value;
        setAppliedCoupon({ code: coupon.code, discount });
        toast(`Coupon applied! You saved ${formatBDT(discount)}`, 'success');
      }
    }
    setChecking(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const finalTotal = total - (appliedCoupon?.discount || 0);

  const checkout = () => {
    if (!user) {
      toast('Please sign in to purchase eBooks.', 'info');
      navigate('/login', { state: { from: '/checkout', purchase: true } });
      return;
    }
    navigate('/checkout', { state: { coupon: appliedCoupon } });
  };

  const handleRemove = (id: string, isPackage: boolean) => {
    remove(id, isPackage);
  };

  const handleUpdateQty = (id: string, quantity: number, isPackage: boolean) => {
    updateQty(id, quantity, isPackage);
  };

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-br from-emerald-50 to-white py-10">
        <div className="container-page">
          <h1 className="text-3xl font-bold text-ink-900">Shopping Cart</h1>
          <p className="mt-2 text-ink-500">{items.length} item{items.length !== 1 ? 's' : ''} in your cart.</p>
        </div>
      </section>

      <div className="container-page py-10">
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Browse our collection and add some Islamic eBooks to your cart."
            action={<Link to="/shop" className="btn-primary">Browse Books</Link>}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Items */}
            <div>
              <div className="card divide-y divide-ink-100">
                {items.map((item) => {
                  if (item.isPackage && item.package) {
                    const pkg = item.package;
                    const price = packageEffectivePrice(pkg);
                    const savings = packageSavings(pkg);

                    return (
                      <div key={`pkg-${pkg.id}`} className="flex gap-4 p-4 bg-emerald-50/50">
                        <Link to={`/package/${pkg.slug}`} className="shrink-0">
                          {pkg.cover_url ? (
                            <img src={pkg.cover_url} alt={pkg.name} className="h-24 w-16 rounded-lg object-cover sm:h-28 sm:w-20" />
                          ) : (
                            <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-emerald-100 sm:h-28 sm:w-20">
                              <Package className="h-10 w-10 text-emerald-600" />
                            </div>
                          )}
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Package
                            </span>
                          </div>
                          <Link to={`/package/${pkg.slug}`} className="font-semibold text-ink-900 hover:text-emerald-700">
                            {pkg.name}
                          </Link>
                          <p className="text-sm text-ink-500">{pkg.book_count || 0} books included</p>
                          {savings > 0 && (
                            <p className="text-xs text-emerald-600 font-medium">Save {formatBDT(savings)}</p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center gap-1 rounded-lg border border-emerald-200">
                              <button
                                onClick={() => handleUpdateQty(pkg.id, item.quantity - 1, true)}
                                disabled={item.quantity <= 1}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-emerald-100 disabled:opacity-40"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQty(pkg.id, item.quantity + 1, true)}
                                className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-emerald-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-emerald-700">{formatBDT(price * item.quantity)}</span>
                              <button
                                onClick={() => handleRemove(pkg.id, true)}
                                className="text-ink-400 transition hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (item.book) {
                    const book = item.book;
                    const price = effectivePrice(book);

                    return (
                      <div key={book.id} className="flex gap-4 p-4">
                        <Link to={`/book/${book.slug}`} className="shrink-0">
                          <img src={book.cover_url} alt={book.title} className="h-24 w-16 rounded-lg object-cover sm:h-28 sm:w-20" />
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <Link to={`/book/${book.slug}`} className="font-semibold text-ink-900 hover:text-emerald-700">
                            {book.title}
                          </Link>
                          <p className="text-sm text-ink-500">{book.author}</p>
                          <p className="text-xs text-ink-400">{book.language} • {book.pages} pages</p>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center gap-1 rounded-lg border border-ink-200">
                              <button
                                onClick={() => handleUpdateQty(book.id, item.quantity - 1, false)}
                                disabled={item.quantity <= 1}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-ink-50 disabled:opacity-40"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQty(book.id, item.quantity + 1, false)}
                                className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-ink-50"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-emerald-700">{formatBDT(price * item.quantity)}</span>
                              <button
                                onClick={() => handleRemove(book.id, false)}
                                className="text-ink-400 transition hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Link to="/shop" className="btn-ghost">← Continue Shopping</Link>
                <button onClick={clear} className="btn-ghost text-red-600 hover:bg-red-50">Clear Cart</button>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="card sticky top-28 p-6">
                <h2 className="text-lg font-bold text-ink-900">Order Summary</h2>

                {/* Coupon */}
                <div className="mt-4">
                  <label className="label">Coupon Code</label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <Tag className="h-4 w-4" /> {appliedCoupon.code}
                      </span>
                      <button onClick={removeCoupon} className="text-emerald-700 hover:text-emerald-900">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter code"
                        className="input py-2 text-sm uppercase"
                      />
                      <button onClick={applyCoupon} disabled={checking} className="btn-outline py-2 text-sm">
                        {checking ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-ink-400">Try: NOOR10, WELCOME50, RAMADAN20</p>
                </div>

                <div className="mt-5 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-600">Subtotal</span>
                    <span className="font-semibold text-ink-900">{formatBDT(total)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span className="font-semibold">-{formatBDT(appliedCoupon.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-600">Tax</span>
                    <span className="font-semibold text-ink-900">Included</span>
                  </div>
                  <div className="flex justify-between border-t border-ink-100 pt-3 text-lg">
                    <span className="font-bold text-ink-900">Total</span>
                    <span className="font-bold text-emerald-700">{formatBDT(finalTotal)}</span>
                  </div>
                </div>

                <button onClick={checkout} className="btn-primary mt-5 w-full py-3 text-base">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-3 text-center text-xs text-ink-500">Secure payment via bKash, Nagad, Rocket</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
