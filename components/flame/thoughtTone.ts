import type { Flame, FlameMood } from '@/lib/flame/types';

export type ThoughtToneKey = 'plain' | 'spark' | 'serious' | 'angry';

export type ThoughtTone = {
  key: ThoughtToneKey;
  label: string;
  fullLabel: string;
  mood: FlameMood;
  selfStrength: 1 | 2 | 3;
  tagClassName: string;
  bubbleClassName: string;
  chipClassName: string;
};

export const THOUGHT_TONES: ThoughtTone[] = [
  {
    key: 'plain',
    label: '기본',
    fullLabel: '기본',
    mood: 'quiet',
    selfStrength: 1,
    tagClassName: 'bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.74)]',
    bubbleClassName: 'bg-white text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)]',
    chipClassName: 'bg-white text-[#252520]',
  },
  {
    key: 'spark',
    label: '반짝',
    fullLabel: '반짝 생각남',
    mood: 'curious',
    selfStrength: 2,
    tagClassName: 'bg-[#ffd84d] text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.74)]',
    bubbleClassName: 'bg-[#fff1a8] text-[#252520] shadow-[2px_2px_0_rgba(35,35,31,0.72)]',
    chipClassName: 'bg-[#ffd84d] text-[#252520]',
  },
  {
    key: 'serious',
    label: '진지함',
    fullLabel: '진지함',
    mood: 'serious',
    selfStrength: 2,
    tagClassName: 'bg-[#3a3a3a] text-white shadow-[2px_2px_0_rgba(35,35,31,0.78)]',
    bubbleClassName: 'bg-[#3a3a3a] text-white shadow-[2px_2px_0_rgba(35,35,31,0.72)]',
    chipClassName: 'bg-[#3a3a3a] text-white',
  },
  {
    key: 'angry',
    label: '열받음',
    fullLabel: '열받음',
    mood: 'want_talk',
    selfStrength: 3,
    tagClassName: 'bg-[#ef3b32] text-white shadow-[2px_2px_0_rgba(35,35,31,0.78)]',
    bubbleClassName: 'bg-[#ef3b32] text-white shadow-[2px_2px_0_rgba(35,35,31,0.72)]',
    chipClassName: 'bg-[#ef3b32] text-white',
  },
];

const defaultTone = THOUGHT_TONES[1];

export function thoughtToneForKey(key: ThoughtToneKey): ThoughtTone {
  return THOUGHT_TONES.find((tone) => tone.key === key) ?? defaultTone;
}

export function thoughtToneForFlame(flame: Pick<Flame, 'mood' | 'selfStrength'>): ThoughtTone {
  if (flame.mood === 'want_talk' || flame.selfStrength === 3) return thoughtToneForKey('angry');
  if (flame.mood === 'serious') return thoughtToneForKey('serious');
  if (flame.mood === 'quiet' || flame.selfStrength === 1) return thoughtToneForKey('plain');
  return defaultTone;
}
