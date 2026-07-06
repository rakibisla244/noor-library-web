import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export default function Rating({
  value,
  count,
  size = 'md',
  showCount = true,
  interactive = false,
  onChange,
}: RatingProps) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          const half = !filled && star - 0.5 <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(star)}
              className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
              aria-label={`${star} star`}
            >
              <Star
                className={`${sizeClass} ${
                  filled
                    ? 'fill-gold-400 text-gold-400'
                    : half
                    ? 'fill-gold-200 text-gold-200'
                    : 'fill-ink-200 text-ink-200'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showCount && (
        <span className="text-xs font-medium text-ink-500">
          {value.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}
