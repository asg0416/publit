'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import type { CharacterKey, FlameCategory, FlameMood, HotTopic, TagSuggestion } from '@/lib/flame/types';
import { normalizeTagLabel, suggestTagsFromText } from '@/lib/flame/tagNormalize';
import { isBlockedText } from '@/lib/moderation/rules';
import { CHARACTER_EMOJI, sanitizeCustomEmoji } from '@/components/map/character';
import { THOUGHT_TONES, thoughtToneForKey, type ThoughtToneKey } from './thoughtTone';
import { MyFlameSlots } from './MyFlameSlots';

type InlineThoughtComposerProps = {
  topics: HotTopic[];
  remoteSuggestions: TagSuggestion[];
  slots: {
    used: number;
    limit: number;
    activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }>;
  } | null;
  submitMessage?: string;
  onFocus?: () => void;
  onSuggest: (text: string) => void;
  onSubmit: (input: { text: string; tagLabel: string; category: FlameCategory; mood: FlameMood; selfStrength: 1 | 2 | 3; characterKey: CharacterKey; characterEmoji?: string }) => boolean | void | Promise<boolean | void>;
  onExtinguish: (flameId: string) => void;
};

const characterKeys = Object.keys(CHARACTER_EMOJI) as CharacterKey[];

export function InlineThoughtComposer({ topics, remoteSuggestions, slots, submitMessage, onFocus, onSuggest, onSubmit, onExtinguish }: InlineThoughtComposerProps) {
  const [text, setText] = useState('');
  const [tagOverride, setTagOverride] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<FlameCategory>('other');
  const [toneKey, setToneKey] = useState<ThoughtToneKey>('spark');
  const [characterKey, setCharacterKey] = useState<CharacterKey>('turtle');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const localSuggestions = useMemo(() => suggestTagsFromText(text).map((item) => ({
    displayLabel: item.displayLabel,
    normalizedKey: item.displayLabel.replace(/^#/, ''),
    category: item.category,
    source: 'local',
  })), [text]);

  const suggestions = useMemo(() => [...localSuggestions, ...remoteSuggestions].filter((item, index, array) =>
    array.findIndex((other) => other.normalizedKey === item.normalizedKey) === index
  ), [localSuggestions, remoteSuggestions]);

  const suggestedTag = suggestions[0] ?? (text.trim().length > 1 && topics[0] ? {
    displayLabel: topics[0].displayLabel,
    normalizedKey: topics[0].normalizedKey,
    category: topics[0].category,
    source: 'topic',
  } : null);
  const tagLabel = tagOverride ?? suggestedTag?.displayLabel ?? '';
  const category = tagOverride === null ? suggestedTag?.category ?? 'other' : manualCategory;
  const blocked = isBlockedText(`${text} ${tagLabel}`);
  const isFull = slots ? slots.used >= slots.limit : false;
  const selectedTone = thoughtToneForKey(toneKey);
  const customEmoji = sanitizeCustomEmoji(customEmojiInput);
  const hasInvalidCustomEmoji = Boolean(customEmojiInput.trim() && !customEmoji);
  const selectedEmoji = customEmoji ?? CHARACTER_EMOJI[characterKey];
  const canSubmit = Boolean(text.trim() && tagLabel && !blocked && !hasInvalidCustomEmoji && !submitting);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (text.trim().length > 1) onSuggest(text);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [onSuggest, text]);

  const handleTagChange = (next: string) => {
    const normalized = normalizeTagLabel(next);
    setTagOverride(normalized);
    const selected = suggestions.find((item) => item.displayLabel === normalized);
    setManualCategory(selected?.category ?? 'other');
  };

  const handleSuggestionSelect = (suggestion: TagSuggestion) => {
    setTagOverride(suggestion.displayLabel);
    setManualCategory(suggestion.category);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        text,
        tagLabel,
        category,
        mood: selectedTone.mood,
        selfStrength: selectedTone.selfStrength,
        characterKey,
        characterEmoji: customEmoji ?? undefined,
      });
      if (result === true) {
        setText('');
        setTagOverride(null);
        setOptionsOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      data-testid="inline-thought-composer"
      className="anigeunde-inline-composer pointer-events-auto absolute inset-x-3 bottom-3 z-[80] mx-auto grid max-w-2xl gap-1.5 rounded-[18px] bg-white p-2 shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)] sm:bottom-4"
      onSubmit={handleSubmit}
      onFocus={onFocus}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          data-testid="composer-options-toggle"
          onClick={() => setOptionsOpen((current) => !current)}
          className="relative grid size-11 shrink-0 place-items-center rounded-[13px] bg-white text-xl shadow-[1px_1px_0_rgba(35,35,31,0.62),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color] active:scale-[0.96]"
          aria-label="작성 옵션"
          aria-expanded={optionsOpen}
        >
          {selectedEmoji}
          <span className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shadow-[1px_1px_0_rgba(35,35,31,0.42)] ${selectedTone.chipClassName}`}>
            {selectedTone.label}
          </span>
        </button>
        <label className="sr-only" htmlFor="inline-thought-text">지금 떠오른 생각</label>
        <input
          id="inline-thought-text"
          value={text}
          maxLength={80}
          onChange={(event) => setText(event.target.value)}
          className="min-h-11 min-w-0 rounded-[13px] border border-[#d5d2c8] bg-white px-3 text-sm font-bold text-[#252520] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-[#9a968c] focus:border-[#ef3b32] focus:bg-white focus:shadow-[0_0_0_3px_rgba(239,59,50,0.14)]"
          placeholder="아니근데... 지금 나만 이 생각해?"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="grid size-11 place-items-center rounded-[13px] bg-[#ef3b32] text-white shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-[transform,background-color,opacity] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="생각 띄우기"
        >
          <SendHorizontal size={18} />
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <label className="sr-only" htmlFor="inline-flame-tag">생각 태그</label>
        <div
          data-testid="composer-tag-preview"
          data-tone={selectedTone.key}
          className={`rounded-[12px] p-0.5 transition-[background-color,color,box-shadow] ${selectedTone.tagClassName}`}
        >
          <input
            id="inline-flame-tag"
            value={tagLabel}
            maxLength={20}
            onChange={(event) => handleTagChange(event.target.value)}
            className="min-h-8 w-full min-w-0 rounded-[10px] bg-transparent px-3 text-xs font-black text-inherit outline-none placeholder:text-current/55"
            placeholder="#지금생각"
            aria-label="생각 태그"
          />
        </div>
        <span className="font-mono text-[10px] font-black tabular-nums text-[#9a968c]">{text.length}/80</span>
      </div>

      {optionsOpen ? (
        <div data-testid="composer-options-panel" className="anigeunde-options-panel grid max-h-[34svh] gap-2 overflow-y-auto rounded-[14px] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(35,35,31,0.08)]">
          <div className="grid gap-1">
            <span className="text-[10px] font-black text-[#6f6b61]">캐릭터</span>
            <div className="flex gap-1 overflow-x-auto px-0.5 pb-1" role="group" aria-label="캐릭터">
              {characterKeys.map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    setCharacterKey(key);
                    setCustomEmojiInput('');
                  }}
                  className={`grid size-10 shrink-0 place-items-center rounded-[11px] bg-white text-lg shadow-[1px_1px_0_rgba(35,35,31,0.44),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color,outline-color] active:scale-[0.96] ${!customEmoji && characterKey === key ? 'outline outline-2 outline-[#ef3b32]' : 'outline outline-0 outline-transparent'}`}
                  aria-label={`캐릭터 ${key}`}
                >
                  {CHARACTER_EMOJI[key]}
                </button>
              ))}
              <label className="grid min-w-[4.5rem] shrink-0 gap-0.5">
                <span className="text-[9px] font-black text-[#6f6b61]">직접 이모지</span>
                <input
                  value={customEmojiInput}
                  onChange={(event) => setCustomEmojiInput(event.target.value)}
                  inputMode="text"
                  maxLength={16}
                  aria-label="직접 이모지"
                  placeholder="😀"
                  className={`min-h-10 rounded-[11px] bg-white px-2 text-center text-lg outline-none shadow-[1px_1px_0_rgba(35,35,31,0.44),0_0_0_1px_rgba(35,35,31,0.08)] transition-[box-shadow] ${
                    customEmoji ? 'outline outline-2 outline-[#ef3b32]' : ''
                  }`}
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="생각 상태">
            {THOUGHT_TONES.map((option) => (
              <button
                type="button"
                key={option.key}
                onClick={() => setToneKey(option.key)}
                className={`min-h-10 min-w-0 rounded-[10px] px-1.5 text-[10px] font-black shadow-[1px_1px_0_rgba(35,35,31,0.38)] transition-[transform,background-color,color] active:scale-[0.96] ${
                  toneKey === option.key ? option.chipClassName : 'bg-white text-[#6f6b61]'
                }`}
                aria-label={option.fullLabel}
                aria-pressed={toneKey === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
          {suggestions.length ? (
            <div className="flex gap-1 overflow-x-auto pb-0.5" aria-label="추천 태그">
              {suggestions.slice(0, 6).map((suggestion) => (
                <button
                  type="button"
                  key={`${suggestion.source}-${suggestion.normalizedKey}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="min-h-8 shrink-0 rounded-full bg-white px-3 text-[11px] font-black text-[#5d5a51] shadow-[1px_1px_0_rgba(35,35,31,0.32),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color,color] hover:bg-[#f5f5f5] active:scale-[0.96]"
                >
                  {suggestion.displayLabel}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasInvalidCustomEmoji ? <p className="rounded-[10px] bg-[#ef3b32]/10 px-3 py-2 text-xs font-bold text-[#b52620]">직접 캐릭터는 이모지 하나만 넣을 수 있어요.</p> : null}
      {blocked ? <p className="rounded-[10px] bg-[#cf2d56]/10 px-3 py-2 text-xs font-bold text-[#9e1d3e]">위험하거나 사생활을 침해할 수 있는 문구는 생각으로 띄울 수 없어요.</p> : null}
      {submitMessage ? <p role="status" className="rounded-[10px] bg-[#9fbbe0]/20 px-3 py-2 text-xs font-bold text-[#27476b]">{submitMessage}</p> : null}
      {isFull ? (
        <div className="grid gap-2">
          <p className="rounded-[10px] bg-[#ffda68]/35 px-3 py-2 text-xs font-black text-[#6d4e00]">내 생각 슬롯이 모두 차 있어요. 새 생각을 띄우려면 기존 생각 하나를 내려주세요.</p>
          <MyFlameSlots slots={slots} onExtinguish={onExtinguish} />
        </div>
      ) : null}
    </form>
  );
}
