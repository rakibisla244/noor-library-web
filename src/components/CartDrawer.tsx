import { Link } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatBDT, effectivePrice, packageEffectivePrice, packageSavings } from '../lib/types';

export default function CartDrawer() {
  const { items, isOpen, setOpen, remove, updateQty, total, count } = useCart();

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-ink-900">Your Cart</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{count}</span>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink-900">Your cart is empty</h3>
              <p className="mt-1 text-sm text-ink-500">Browse our collection and add some books.</p>
            </div>
            <Link to="/shop" onClick={() => setOpen(false)} className="btn-primary">
              Browse Books
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              <div className="space-y-4">
                {items.map((item) => {
                  if (item.isPackage && item.package) {
                    const pkg = item.package;
                    const price = packageEffectivePrice(pkg);
                    const savings = packageSavings(pkg);
                    return (
                      <div key={`pkg-${pkg.id}`} className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                        <Link to={`/package/${pkg.slug}`} onClick={() => setOpen(false)} className="shrink-0">
                          {pkg.cover_url ? (
                            <img src={pkg.cover_url} alt={pkg.name} className="h-24 w-16 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-emerald-100">
                              <Package className="h-8 w-8 text-emerald-600" />
                            </div>
                          )}
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <Link
                            to={`/package/${pkg.slug}`}
                            onClick={() => setOpen(false)}
                            className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-emerald-700"
                          >
                            {pkg.name}
                          </Link>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-emerald-600">Package</span>
                            <span className="text-xs text-ink-400">•</span>
                            <span className="text-xs text-ink-500">{pkg.book_count || 0} books</span>
                          </div>
                          {savings > 0 && (
                            <span className="mt-1 text-xs font-medium text-emerald-600">Save {formatBDT(savings)}</span>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1 rounded-lg border border-emerald-200">
                              <button
                                onClick={() => updateQty(pkg.id, item.quantity - 1, true)}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-emerald-50"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQty(pkg.id, item.quantity + 1, true)}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-emerald-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-700">{formatBDT(price * item.quantity)}</span>
                              <button
                                onClick={() => remove(pkg.id, true)}
                                className="text-ink-400 transition hover:text-red-500"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (item.book) {
                    const price = effectivePrice(item.book);
                    return (
                      <div key={item.book.id} className="flex gap-3 rounded-xl border border-ink-100 p-3">
                        <Link to={`/book/${item.book.slug}`} onClick={() => setOpen(false)} className="shrink-0">
                          <img src={item.book.cover_url} alt={item.book.title} className="h-24 w-16 rounded-lg object-cover" />
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <Link
                            to={`/book/${item.book.slug}`}
                            onClick={() => setOpen(false)}
                            className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-emerald-700"
                          >
                            {item.book.title}
                          </Link>
                          <p className="text-xs text-ink-500">{item.book.author}</p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1 rounded-lg border border-ink-200">
                              <button
                                onClick={() => updateQty(item.book!.id, item.quantity - 1, false)}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-ink-50"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQty(item.book!.id, item.quantity + 1, false)}
                                className="flex h-9 w-9 items-center justify-center text-ink-600 hover:bg-ink-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-700">{formatBDT(price * item.quantity)}</span>
                              <button
                                onClick={() => remove(item.book!.id, false)}
                                className="text-ink-400 transition hover:text-red-500"
                                aria-label="Remove"
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
            </div>

            <div className="border-t border-ink-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-ink-600">Subtotal</span>
                <span className="text-xl font-bold text-ink-900">{formatBDT(total)}</span>
              </div>
              <p className="mb-3 text-xs text-ink-500">Taxes included. Shipping calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/cart" onClick={() => setOpen(false)} className="btn-outline">
                  View Cart
                </Link>
                <Link to="/checkout" onClick={() => setOpen(false)} className="btn-primary">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
