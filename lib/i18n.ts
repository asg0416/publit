export type ContentLocale = 'ko' | 'en';

export function normalizeContentLocale(value: unknown): ContentLocale {
  if (value === undefined || value === null || value === '') return 'ko';
  return String(value ?? '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function getPreferredContentLocale(): ContentLocale {
  if (typeof navigator === 'undefined') return 'ko';
  return normalizeContentLocale(navigator.language);
}
