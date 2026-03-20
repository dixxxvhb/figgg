import { haptic } from '../../utils/haptics';

const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];

interface MoodSelectorProps {
  value: number | undefined;
  onChange: (mood: number) => void;
  size?: 'sm' | 'md';
}

export function MoodSelector({ value, onChange, size = 'md' }: MoodSelectorProps) {
  const dotSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';

  return (
    <div className="flex items-center gap-2">
      {MOOD_COLORS.map((color, i) => {
        const rating = i + 1;
        const isSelected = value === rating;
        return (
          <button
            key={rating}
            type="button"
            onClick={() => { onChange(rating); haptic('light'); }}
            className={`${dotSize} rounded-full border-2 transition-all flex items-center justify-center min-w-[28px] min-h-[28px]`}
            style={{
              borderColor: color,
              backgroundColor: isSelected ? color : 'transparent',
              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={`${MOOD_LABELS[i]} (${rating}/5)`}
            title={MOOD_LABELS[i]}
          >
            {isSelected && (
              <span className="text-white text-xs font-bold">{rating}</span>
            )}
          </button>
        );
      })}
      {value && (
        <span className="type-caption text-[var(--text-secondary)] ml-1">{MOOD_LABELS[value - 1]}</span>
      )}
    </div>
  );
}
