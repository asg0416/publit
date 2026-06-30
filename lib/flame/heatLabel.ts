import type { HeatLevel } from './types.ts';

export function heatLevelFromLabel(label: string): HeatLevel {
  if (label.includes('이야기') || label.includes('모이고')) return 'hot';
  if (label.includes('자주') || label.includes('요즘') || label.includes('반응')) return 'warming';
  return 'fresh';
}
