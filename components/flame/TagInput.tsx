'use client';

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
      <label className="text-xs font-semibold text-[#99a7b7]" htmlFor="flame-tag">불꽃 태그</label>
      <input
        id="flame-tag"
        value={value}
        maxLength={20}
        onChange={(event) => onChange(normalizeTagLabel(event.target.value))}
        className="min-h-11 rounded-lg bg-white/8 px-3 text-sm text-[#f7efe3] outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] focus:shadow-[inset_0_0_0_2px_rgba(255,154,61,0.65)]"
        placeholder="#카페대화"
      />
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 8).map((suggestion) => (
          <button
            type="button"
            key={`${suggestion.source}-${suggestion.normalizedKey}`}
            onClick={() => onChange(suggestion.displayLabel)}
            className="min-h-9 rounded-full bg-white/10 px-3 text-xs font-semibold text-[#d9e5ef] transition-[transform,opacity] active:scale-[0.96]"
          >
            {suggestion.displayLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
