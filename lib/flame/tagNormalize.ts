import type { FlameCategory } from './types.ts';

type SuggestedTag = { displayLabel: string; category: FlameCategory };

const rules: Array<[RegExp, SuggestedTag[]]> = [
  [/선거/, [
    { displayLabel: '#선거이슈', category: 'politics' },
    { displayLabel: '#정치대화', category: 'politics' },
  ]],
  [/투표/, [
    { displayLabel: '#투표용지이슈', category: 'politics' },
    { displayLabel: '#자료확인', category: 'politics' },
  ]],
  [/부산/, [
    { displayLabel: '#부산', category: 'local' },
    { displayLabel: '#지역이슈', category: 'local' },
  ]],
  [/지역|교통|버스|지하철|도로/, [
    { displayLabel: '#지역교통', category: 'local' },
  ]],
  [/위험|무섭|안전|불안/, [
    { displayLabel: '#안전', category: 'safety' },
  ]],
  [/카페|대화/, [
    { displayLabel: '#카페대화', category: 'daily' },
  ]],
];

export function normalizeTagLabel(raw: string): string {
  const normalized = raw.trim().replace(/^#+/, '').replace(/[^\p{Letter}\p{Number}_가-힣]/gu, '').slice(0, 20);
  return normalized ? `#${normalized}` : '';
}

export function suggestTagsFromText(text: string): SuggestedTag[] {
  const suggestions: SuggestedTag[] = [];
  for (const [pattern, tags] of rules) {
    if (!pattern.test(text)) continue;
    for (const tag of tags) {
      if (!suggestions.some((item) => item.displayLabel === tag.displayLabel)) {
        suggestions.push(tag);
      }
    }
  }
  if (text.trim().length > 1 && suggestions.length === 0) {
    suggestions.push({ displayLabel: '#지금생각', category: 'other' });
  }

  return suggestions.slice(0, 8);
}
