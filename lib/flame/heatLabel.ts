import type { HeatLevel } from './types.ts';

export function heatLevelFromLabel(label: string): HeatLevel {
  if (label.includes('번지고') || label.includes('뜨거워')) return 'hot';
  if (label.includes('커지고') || label.includes('반응')) return 'warming';
  return 'fresh';
}
