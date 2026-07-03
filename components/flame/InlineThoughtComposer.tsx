'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { SendHorizontal, Settings2 } from 'lucide-react';
import type { CharacterKey, FlameCategory, FlameMood, HotTopic, TagSuggestion } from '@/lib/flame/types';
import { normalizeTagLabel, suggestTagsFromText } from '@/lib/flame/tagNormalize';
import { isBlockedText } from '@/lib/moderation/rules';
import { CHARACTER_EMOJI, sanitizeCustomEmoji } from '@/components/map/character';
import { BottomSheet } from '@/components/ui/BottomSheet';
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

function useVisualKeyboardLift() {
  const [keyboardLift, setKeyboardLift] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      const lift = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardLift(Math.round(lift));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return keyboardLift;
}

export function InlineThoughtComposer({ topics, remoteSuggestions, slots, submitMessage, onFocus, onSuggest, onSubmit, onExtinguish }: InlineThoughtComposerProps) {
  const [text, setText] = useState('');
  const [tagOverride, setTagOverride] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<FlameCategory>('other');
  const [toneKey, setToneKey] = useState<ThoughtToneKey>('spark');
  const [characterKey, setCharacterKey] = useState<CharacterKey>('turtle');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const keyboardLift = useVisualKeyboardLift();

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
  const visibleSubmitMessage = isFull && submitMessage === '내 생각 슬롯이 모두 차 있어요.' ? '' : submitMessage;

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
      className="anigeunde-inline-composer pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[160] mx-auto grid max-w-2xl gap-1.5 rounded-[18px] bg-white p-2 shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)] sm:bottom-4"
      style={keyboardLift > 0 ? { bottom: `calc(env(safe-area-inset-bottom) + 0.75rem + ${keyboardLift}px)` } : undefined}
      onSubmit={handleSubmit}
      onFocus={onFocus}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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

      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        <button
          type="button"
          onClick={() => setOptionsOpen(true)}
          className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white text-lg shadow-[1px_1px_0_rgba(35,35,31,0.48),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color] active:scale-[0.96]"
          aria-label="캐릭터 설정"
        >
          {selectedEmoji}
        </button>
        <button
          type="button"
          data-testid="composer-tag-preview"
          data-tone={selectedTone.key}
          onClick={() => setOptionsOpen(true)}
          className={`min-h-9 min-w-0 max-w-[44%] truncate rounded-full px-3 text-left text-xs font-black transition-[transform,background-color,color,box-shadow] active:scale-[0.96] ${selectedTone.tagClassName}`}
          aria-label="태그 설정"
        >
          {tagLabel || '#지금생각'}
        </button>
        <button
          type="button"
          onClick={() => setOptionsOpen(true)}
          className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-black shadow-[1px_1px_0_rgba(35,35,31,0.42)] transition-transform active:scale-[0.96] ${selectedTone.chipClassName}`}
          aria-label="기분 설정"
        >
          {selectedTone.label}
        </button>
        <span className="ml-auto shrink-0 font-mono text-[10px] font-black tabular-nums text-[#9a968c]">{text.length}/80</span>
        <button
          type="button"
          data-testid="composer-options-toggle"
          onClick={() => setOptionsOpen(true)}
          className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.48),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color] active:scale-[0.96]"
          aria-label="작성 옵션"
          aria-expanded={optionsOpen}
        >
          <Settings2 size={16} />
        </button>
      </div>

      <BottomSheet open={optionsOpen} title="생각 자세히 띄우기" onClose={() => setOptionsOpen(false)}>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-black text-[#6f6b61]">지금 떠오른 생각</span>
            <textarea
              value={text}
              maxLength={80}
              onChange={(event) => setText(event.target.value)}
              className="min-h-24 resize-none rounded-[14px] border border-[#d5d2c8] bg-white p-3 text-sm font-bold leading-6 text-[#252520] outline-none transition-[border-color,box-shadow] placeholder:text-[#9a968c] focus:border-[#ef3b32] focus:shadow-[0_0_0_3px_rgba(239,59,50,0.14)]"
              placeholder="아니근데... 지금 나만 이 생각해?"
              aria-label="지금 떠오른 생각"
            />
            <span className="text-right font-mono text-xs font-black tabular-nums text-[#6f6b61]">{text.length}/80</span>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black text-[#6f6b61]">생각 태그</span>
            <input
              value={tagLabel}
              maxLength={20}
              onChange={(event) => handleTagChange(event.target.value)}
              className="min-h-11 rounded-[14px] border border-[#d5d2c8] bg-white px-3 text-sm font-black text-[#252520] outline-none transition-[border-color,box-shadow] placeholder:text-[#9a968c] focus:border-[#ef3b32] focus:shadow-[0_0_0_3px_rgba(239,59,50,0.14)]"
              placeholder="#지금생각"
              aria-label="생각 태그"
            />
          </label>

          <section className="grid gap-2">
            <h3 className="text-xs font-black text-[#6f6b61]">기분</h3>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="생각 상태">
              {THOUGHT_TONES.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => setToneKey(option.key)}
                  className={`min-h-10 min-w-0 rounded-full px-2 text-[11px] font-black shadow-[1px_1px_0_rgba(35,35,31,0.42)] transition-[transform,background-color,color] active:scale-[0.96] ${
                    toneKey === option.key ? option.chipClassName : 'bg-white text-[#6f6b61]'
                  }`}
                  aria-label={option.fullLabel}
                  aria-pressed={toneKey === option.key}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-2">
            <h3 className="text-xs font-black text-[#6f6b61]">캐릭터</h3>
            <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-1.5" role="group" aria-label="캐릭터">
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
            </div>
            <label className="grid gap-1">
              <span className="text-[10px] font-black text-[#6f6b61]">직접 이모지</span>
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
          </section>

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

          <MyFlameSlots slots={slots} onExtinguish={onExtinguish} />

          {hasInvalidCustomEmoji ? <p className="rounded-[10px] bg-[#ef3b32]/10 px-3 py-2 text-xs font-bold text-[#b52620]">직접 캐릭터는 이모지 하나만 넣을 수 있어요.</p> : null}
          {blocked ? <p className="rounded-[10px] bg-[#ef3b32]/10 px-3 py-2 text-xs font-bold text-[#b52620]">위험하거나 사생활을 침해할 수 있는 문구는 생각으로 띄울 수 없어요.</p> : null}
          {visibleSubmitMessage ? <p role="status" className="rounded-[10px] bg-[#9fbbe0]/20 px-3 py-2 text-xs font-bold text-[#27476b]">{visibleSubmitMessage}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-12 rounded-[14px] bg-[#ef3b32] px-4 text-sm font-black text-white shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-[transform,opacity] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
          >
            생각 띄우기
          </button>
        </div>
      </BottomSheet>

      {hasInvalidCustomEmoji ? <p className="rounded-[10px] bg-[#ef3b32]/10 px-3 py-2 text-xs font-bold text-[#b52620]">직접 캐릭터는 이모지 하나만 넣을 수 있어요.</p> : null}
      {blocked ? <p className="rounded-[10px] bg-[#cf2d56]/10 px-3 py-2 text-xs font-bold text-[#9e1d3e]">위험하거나 사생활을 침해할 수 있는 문구는 생각으로 띄울 수 없어요.</p> : null}
      {visibleSubmitMessage ? <p role="status" className="rounded-[10px] bg-[#9fbbe0]/20 px-3 py-2 text-xs font-bold text-[#27476b]">{visibleSubmitMessage}</p> : null}
      {isFull ? (
        <div className="flex items-center gap-2 rounded-[10px] bg-[#ffda68]/35 px-3 py-2">
          <p className="min-w-0 flex-1 text-xs font-black text-[#6d4e00]">내 생각 슬롯이 모두 차 있어요.</p>
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            className="min-h-8 shrink-0 rounded-full bg-white px-3 text-[11px] font-black text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.42)] transition-transform active:scale-[0.96]"
          >
            슬롯 관리
          </button>
        </div>
      ) : null}
    </form>
  );
}
