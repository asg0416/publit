import type { DisplayScope, ThoughtRangeValue } from '@/lib/flame/types';

export const RANGE_OPTIONS: Array<{ value: ThoughtRangeValue; label: string; displayScope: DisplayScope }> = [
  { value: '50m', label: '50m', displayScope: 'nearby' },
  { value: '100m', label: '100m', displayScope: 'nearby' },
  { value: '300m', label: '300m', displayScope: 'nearby' },
  { value: '500m', label: '500m', displayScope: 'nearby' },
  { value: '1km', label: '1km', displayScope: 'district' },
  { value: '3km', label: '3km', displayScope: 'district' },
  { value: '10km', label: '10km', displayScope: 'regional' },
  { value: 'region', label: '지역', displayScope: 'regional' },
  { value: 'national', label: '전국', displayScope: 'national' },
];

type RangeControlProps = {
  value: ThoughtRangeValue;
  onChange: (value: ThoughtRangeValue) => void;
};

export function RangeControl({ value, onChange }: RangeControlProps) {
  return (
    <div
      data-testid="range-control"
      className="grid w-52 grid-cols-3 gap-1.5 rounded-[16px] bg-white/95 p-2 shadow-[2px_2px_0_rgba(35,35,31,0.72)] backdrop-blur-sm"
    >
      {RANGE_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 min-w-0 rounded-[10px] px-1.5 text-[11px] font-black transition-[transform,background-color,color] active:scale-[0.96] ${
            value === option.value ? 'bg-[#ffda68] text-[#252520]' : 'text-[#6f6b61] hover:bg-[#f6f6f0]'
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
