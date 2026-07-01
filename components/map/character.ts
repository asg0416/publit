import type { CharacterKey } from '../../lib/flame/types.ts';

export const CHARACTER_EMOJI: Record<CharacterKey, string> = {
  turtle: '🐢',
  chick: '🐥',
  fox: '🦊',
  dog: '🐶',
  butterfly: '🦋',
  bug: '🐛',
};

const CHARACTER_KEYS = Object.keys(CHARACTER_EMOJI) as CharacterKey[];

function graphemeSegments(value: string) {
  const segmenterConstructor = (Intl as unknown as {
    Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  }).Segmenter;
  if (!segmenterConstructor) return Array.from(value);

  const segmenter = new segmenterConstructor(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(value), (segment) => segment.segment);
}

export function sanitizeCustomEmoji(value?: string | null): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;

  const segments = graphemeSegments(trimmed);
  if (segments.length !== 1) return null;
  const candidate = segments[0];
  if (candidate.length > 16) return null;
  if (/[\p{Letter}\p{Number}\s]/u.test(candidate)) return null;
  if (!/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(candidate)) return null;

  return candidate;
}

export function characterKeyForThought(input: { id: string; tagNormalized?: string; characterKey?: CharacterKey }): CharacterKey {
  if (input.characterKey && CHARACTER_KEYS.includes(input.characterKey)) return input.characterKey;

  const seed = `${input.id}:${input.tagNormalized ?? ''}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return CHARACTER_KEYS[hash % CHARACTER_KEYS.length];
}

export function emojiForThought(input: {
  id: string;
  tagNormalized?: string;
  characterKey?: CharacterKey;
  characterEmoji?: string | null;
}): string {
  return sanitizeCustomEmoji(input.characterEmoji) ?? CHARACTER_EMOJI[characterKeyForThought(input)];
}
