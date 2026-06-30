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

export function characterKeyForThought(input: { id: string; tagNormalized?: string; characterKey?: CharacterKey }): CharacterKey {
  if (input.characterKey && CHARACTER_KEYS.includes(input.characterKey)) return input.characterKey;

  const seed = `${input.id}:${input.tagNormalized ?? ''}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return CHARACTER_KEYS[hash % CHARACTER_KEYS.length];
}
