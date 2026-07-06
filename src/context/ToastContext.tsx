import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container - TOP CENTER */}
      <div className="fixed left-1/2 top-4 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? AlertCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info;
          const color =
            t.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-emerald-200/50'
              : t.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-800 shadow-red-200/50'
              : t.type === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-amber-200/50'
              : 'border-teal-300 bg-teal-50 text-teal-800 shadow-teal-200/50';
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm pointer-events-auto animate-toast-slide-down ${color}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="ml-2 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
