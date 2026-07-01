'use client';

import { X } from 'lucide-react';
import type { TagSuggestion } from '@/lib/flame/types';
import { normalizeTagLabel } from '@/lib/flame/tagNormalize';

type TagInputProps = {
  value: string;
  suggestions: TagSuggestion[];
  onChange: (value: string) => void;
};

export function TagInput({ value, suggestions, onChange }: TagInputProps) {
  return (
    <div className="grid gap-2">
      <label className="text-xs font-black text-[#6f6b61]" htmlFor="flame-tag">생각 태그</label>
      <div className="relative">
        <input
          id="flame-tag"
          value={value}
          maxLength={20}
          onChange={(event) => onChange(normalizeTagLabel(event.target.value))}
          className="min-h-11 w-full rounded-[12px] border border-[#d5d2c8] bg-white px-3 pr-11 text-sm text-[#252520] outline-none transition-[border-color,background-color] placeholder:text-[#9a968c] focus:border-[#ef3b32]"
          placeholder="#카페대화"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#6f6b61] transition-[background-color,color] hover:bg-[#f5f5f5] hover:text-[#252520]"
            aria-label="태그 지우기"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 8).map((suggestion) => (
          <button
            type="button"
            key={`${suggestion.source}-${suggestion.normalizedKey}`}
            onClick={() => onChange(suggestion.displayLabel)}
            className="min-h-9 rounded-full bg-white px-3 text-xs font-black text-[#5d5a51] shadow-[1px_1px_0_rgba(35,35,31,0.45),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color] hover:bg-[#f5f5f5] active:scale-[0.96]"
          >
            {suggestion.displayLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
