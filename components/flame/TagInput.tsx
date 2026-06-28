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
      <label className="text-xs font-semibold text-[#807d72]" htmlFor="flame-tag">불꽃 태그</label>
      <div className="relative">
        <input
          id="flame-tag"
          value={value}
          maxLength={20}
          onChange={(event) => onChange(normalizeTagLabel(event.target.value))}
          className="min-h-11 w-full rounded-lg border border-[#cfcdc4] bg-white px-3 pr-11 text-sm text-[#26251e] outline-none transition-[border-color,background-color] placeholder:text-[#a09c92] focus:border-[#f54e00]"
          placeholder="#카페대화"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#807d72] transition-[background-color,color] hover:bg-[#efeee8] hover:text-[#26251e]"
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
            className="min-h-9 rounded-full border border-[#e6e5e0] bg-[#fafaf7] px-3 text-xs font-semibold text-[#5a5852] transition-[transform,background-color] hover:bg-[#efeee8] active:scale-[0.97]"
          >
            {suggestion.displayLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
