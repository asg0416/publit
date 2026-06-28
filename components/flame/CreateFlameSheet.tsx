'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FlameCategory, FlameMood, HotTopic, TagSuggestion } from '@/lib/flame/types';
import { suggestTagsFromText } from '@/lib/flame/tagNormalize';
import { isBlockedText } from '@/lib/moderation/rules';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { HotTagTicker } from './HotTagTicker';
import { TagInput } from './TagInput';
import { MyFlameSlots } from './MyFlameSlots';

type CreateFlameSheetProps = {
  open: boolean;
  topics: HotTopic[];
  remoteSuggestions: TagSuggestion[];
  slots: {
    used: number;
    limit: number;
    activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }>;
  } | null;
  onClose: () => void;
  onSuggest: (text: string) => void;
  onSubmit: (input: { text: string; tagLabel: string; category: FlameCategory; mood: FlameMood; selfStrength: 1 | 2 | 3 }) => void;
  onExtinguish: (flameId: string) => void;
  submitMessage?: string;
};

const moods: Array<{ value: FlameMood; label: string }> = [
  { value: 'quiet', label: '조용한 불씨' },
  { value: 'curious', label: '궁금한 불꽃' },
  { value: 'serious', label: '강한 문제의식' },
  { value: 'want_talk', label: '대화하고 싶음' },
];

export function CreateFlameSheet({ open, topics, remoteSuggestions, slots, onClose, onSuggest, onSubmit, onExtinguish, submitMessage }: CreateFlameSheetProps) {
  const [text, setText] = useState('');
  const [tagOverride, setTagOverride] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<FlameCategory>('other');
  const [mood, setMood] = useState<FlameMood>('curious');
  const [selfStrength, setSelfStrength] = useState<1 | 2 | 3>(2);

  const localSuggestions = useMemo(() => suggestTagsFromText(text).map((item) => ({
    displayLabel: item.displayLabel,
    normalizedKey: item.displayLabel.replace(/^#/, ''),
    category: item.category,
    source: 'local',
  })), [text]);

  const suggestions = useMemo(() => [...localSuggestions, ...remoteSuggestions].filter((item, index, array) =>
    array.findIndex((other) => other.normalizedKey === item.normalizedKey) === index
  ), [localSuggestions, remoteSuggestions]);

  const suggestedTag = suggestions[0] ?? null;
  const tagLabel = tagOverride ?? suggestedTag?.displayLabel ?? '';
  const category = tagOverride === null ? suggestedTag?.category ?? 'other' : manualCategory;
  const blocked = isBlockedText(`${text} ${tagLabel}`);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (text.trim().length > 1) onSuggest(text);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [onSuggest, text]);

  return (
    <BottomSheet open={open} title="내 불꽃 띄우기" onClose={onClose}>
      <div className="grid gap-5">
        <HotTagTicker topics={topics} />
        <label className="grid gap-2">
          <span className="text-xs font-semibold text-[#807d72]">지금 떠오른 생각</span>
          <textarea
            value={text}
            maxLength={80}
            onChange={(event) => setText(event.target.value)}
            className="min-h-24 resize-none rounded-lg border border-[#cfcdc4] bg-white p-3 text-sm leading-6 text-[#26251e] outline-none transition-[border-color,background-color] placeholder:text-[#a09c92] focus:border-[#f54e00]"
            placeholder="지금 이 공간에서 떠오른 생각을 짧게 적어보세요."
          />
          <span className="text-right font-mono text-xs tabular-nums text-[#807d72]">{text.length}/80</span>
        </label>
        <TagInput
          value={tagLabel}
          suggestions={suggestions}
          onChange={(next) => {
            setTagOverride(next);
            const selected = suggestions.find((item) => item.displayLabel === next);
            setManualCategory(selected?.category ?? 'other');
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          {moods.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => setMood(item.value)}
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-[transform,background-color,border-color] active:scale-[0.97] ${mood === item.value ? 'border-[#f54e00] bg-[#f54e00] text-white' : 'border-[#e6e5e0] bg-white text-[#5a5852]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setSelfStrength(value)}
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-[transform,background-color,border-color] active:scale-[0.97] ${selfStrength === value ? 'border-[#c08532] bg-[#c08532] text-white' : 'border-[#e6e5e0] bg-white text-[#5a5852]'}`}
            >
              {value === 1 ? '작게' : value === 2 ? '보통' : '크게'}
            </button>
          ))}
        </div>
        {blocked ? <p className="rounded-lg bg-[#cf2d56]/10 px-3 py-2 text-sm text-[#9e1d3e]">위험하거나 사생활을 침해할 수 있는 문구는 불꽃으로 띄울 수 없어요.</p> : null}
        {submitMessage ? <p role="status" className="rounded-lg bg-[#9fbbe0]/20 px-3 py-2 text-sm text-[#27476b]">{submitMessage}</p> : null}
        {slots && slots.used === slots.limit ? (
          <p className="rounded-lg bg-[#f54e00]/10 px-3 py-2 text-sm text-[#8a2d00]">내 불꽃이 모두 켜져 있어요. 새 불꽃을 띄우려면 기존 불꽃 하나를 꺼주세요.</p>
        ) : null}
        <MyFlameSlots slots={slots} onExtinguish={onExtinguish} />
        <Button
          disabled={!text.trim() || !tagLabel || blocked}
          onClick={() => onSubmit({ text, tagLabel, category, mood, selfStrength })}
        >
          불꽃 띄우기
        </Button>
      </div>
    </BottomSheet>
  );
}
