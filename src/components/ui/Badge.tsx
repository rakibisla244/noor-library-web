interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'gold' | 'red' | 'gray' | 'blue' | 'outline';
  size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'emerald', size = 'sm' }: BadgeProps) {
  const variants = {
    emerald: 'bg-emerald-100 text-emerald-800',
    gold: 'bg-gold-100 text-gold-800',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-ink-100 text-ink-700',
    teal: 'bg-teal-100 text-teal-700',
    outline: 'border border-ink-200 text-ink-700',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };
  return <span className={`badge ${variants[variant]} ${sizes[size]}`}>{children}</span>;
}
