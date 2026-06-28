'use client';

import { useEffect, useState } from 'react';
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
  const [tagLabel, setTagLabel] = useState('');
  const [tagManuallyEdited, setTagManuallyEdited] = useState(false);
  const [category, setCategory] = useState<FlameCategory>('other');
  const [mood, setMood] = useState<FlameMood>('curious');
  const [selfStrength, setSelfStrength] = useState<1 | 2 | 3>(2);
  const localSuggestions = suggestTagsFromText(text).map((item) => ({
    displayLabel: item.displayLabel,
    normalizedKey: item.displayLabel.replace(/^#/, ''),
    category: item.category,
    source: 'local',
  }));
  const suggestions = [...localSuggestions, ...remoteSuggestions].filter((item, index, array) =>
    array.findIndex((other) => other.normalizedKey === item.normalizedKey) === index
  );
  const suggestedTag = suggestions[0] ?? null;
  const effectiveTagLabel = tagManuallyEdited ? tagLabel : suggestedTag?.displayLabel || '';
  const effectiveCategory = tagManuallyEdited ? category : suggestedTag?.category ?? category;
  const blocked = isBlockedText(`${text} ${effectiveTagLabel}`);

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
          <span className="text-xs font-semibold text-[#99a7b7]">지금 떠오른 생각</span>
          <textarea
            value={text}
            maxLength={80}
            onChange={(event) => setText(event.target.value)}
            className="min-h-24 resize-none rounded-xl bg-white/8 p-3 text-sm leading-6 text-[#f7efe3] outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] focus:shadow-[inset_0_0_0_2px_rgba(255,154,61,0.65)]"
            placeholder="지금 이 공간에서 떠오른 생각을 짧게 적어보세요."
          />
          <span className="text-right font-mono text-xs tabular-nums text-[#99a7b7]">{text.length}/80</span>
        </label>
        <TagInput
          value={effectiveTagLabel}
          suggestions={suggestions}
          onChange={(next) => {
            setTagManuallyEdited(true);
            setTagLabel(next);
            const selected = suggestions.find((item) => item.displayLabel === next);
            setCategory(selected?.category ?? 'other');
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          {moods.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => setMood(item.value)}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-[transform,background-color] active:scale-[0.96] ${mood === item.value ? 'bg-[#ff9a3d] text-[#160d06]' : 'bg-white/10 text-[#d9e5ef]'}`}
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
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-[transform,background-color] active:scale-[0.96] ${selfStrength === value ? 'bg-[#ffe27a] text-[#160d06]' : 'bg-white/10 text-[#d9e5ef]'}`}
            >
              {value === 1 ? '작게' : value === 2 ? '보통' : '크게'}
            </button>
          ))}
        </div>
        {blocked ? <p className="rounded-lg bg-[#ff5c7a]/12 px-3 py-2 text-sm text-[#ff9fb0]">위험하거나 사생활을 침해할 수 있는 문구는 불꽃으로 띄울 수 없어요.</p> : null}
        {submitMessage ? <p role="status" className="rounded-lg bg-[#4cc9f0]/12 px-3 py-2 text-sm text-[#8ee7ff]">{submitMessage}</p> : null}
        {slots && slots.used === slots.limit ? (
          <p className="rounded-lg bg-[#ff9a3d]/12 px-3 py-2 text-sm text-[#ffca8a]">내 불꽃이 모두 켜져 있어요. 새 불꽃을 띄우려면 기존 불꽃 하나를 꺼주세요.</p>
        ) : null}
        <MyFlameSlots slots={slots} onExtinguish={onExtinguish} />
        <Button
          disabled={!text.trim() || !effectiveTagLabel || blocked}
          onClick={() => onSubmit({ text, tagLabel: effectiveTagLabel, category: effectiveCategory, mood, selfStrength })}
        >
          불꽃 띄우기
        </Button>
      </div>
    </BottomSheet>
  );
}
