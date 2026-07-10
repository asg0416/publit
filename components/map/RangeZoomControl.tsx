'use client';

import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { RANGE_OPTIONS } from './RangeControl';
import type { ThoughtRangeValue } from '@/lib/flame/types';

type RangeZoomControlProps = {
  value: ThoughtRangeValue;
  onChange: (value: ThoughtRangeValue) => void;
};

const PHYSICAL_RANGE_OPTIONS = RANGE_OPTIONS.filter((option) => option.value !== 'region' && option.value !== 'national');

function nextRange(value: ThoughtRangeValue, direction: -1 | 1) {
  const index = PHYSICAL_RANGE_OPTIONS.findIndex((option) => option.value === value);
  const nextIndex = Math.max(0, Math.min(PHYSICAL_RANGE_OPTIONS.length - 1, (index < 0 ? 0 : index) + direction));
  return PHYSICAL_RANGE_OPTIONS[nextIndex].value;
}

export function RangeZoomControl({ value, onChange }: RangeZoomControlProps) {
  const changeBy = (direction: -1 | 1) => onChange(nextRange(value, direction));

  return (
    <div
      data-testid="range-zoom-control"
      className="grid w-10 overflow-hidden rounded-[12px] bg-white shadow-[2px_2px_0_rgba(35,35,31,0.72),0_0_0_1px_rgba(35,35,31,0.08)]"
      aria-label={`현재 반경 ${value}`}
    >
      <RangeButton direction={1} label="반경 넓히기" icon={<Plus size={17} strokeWidth={2.6} />} onChange={changeBy} />
      <span className="border-y border-[#e7e5df] px-0.5 py-1 text-center text-[8px] font-black leading-3 text-[#6f6b61]" aria-hidden="true">
        {value}
      </span>
      <RangeButton direction={-1} label="반경 줄이기" icon={<Minus size={17} strokeWidth={2.6} />} onChange={changeBy} />
    </div>
  );
}

function RangeButton({ direction, label, icon, onChange }: {
  direction: -1 | 1;
  label: string;
  icon: ReactNode;
  onChange: (direction: -1 | 1) => void;
}) {
  const repeatTimerRef = useRef<number | null>(null);
  const repeatStartTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (repeatStartTimerRef.current !== null) window.clearTimeout(repeatStartTimerRef.current);
    if (repeatTimerRef.current !== null) window.clearInterval(repeatTimerRef.current);
  }, []);

  const stopRepeating = () => {
    if (repeatStartTimerRef.current !== null) window.clearTimeout(repeatStartTimerRef.current);
    if (repeatTimerRef.current !== null) window.clearInterval(repeatTimerRef.current);
    repeatStartTimerRef.current = null;
    repeatTimerRef.current = null;
  };

  const startRepeating = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onChange(direction);
    repeatStartTimerRef.current = window.setTimeout(() => {
      repeatTimerRef.current = window.setInterval(() => onChange(direction), 160);
    }, 360);
  };

  return (
    <button
      type="button"
      className="grid min-h-10 place-items-center text-[#252520] transition-[background-color,transform] hover:bg-[#f5f5f5] active:scale-[0.94]"
      aria-label={label}
      onPointerDown={startRepeating}
      onPointerUp={stopRepeating}
      onPointerCancel={stopRepeating}
      onPointerLeave={stopRepeating}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChange(direction);
        }
      }}
    >
      {icon}
    </button>
  );
}
