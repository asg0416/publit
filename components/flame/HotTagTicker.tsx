'use client';

import { useEffect, useState } from 'react';
import type { HotTopic } from '@/lib/flame/types';

type HotTagTickerProps = {
  topics: HotTopic[];
  compact?: boolean;
  locale?: 'ko' | 'en';
  scope?: HotTopic['scope'];
  onScopeChange?: (scope: HotTopic['scope']) => void;
};

const scopeOptions: Array<{ value: HotTopic['scope']; ko: string; en: string }> = [
  { value: 'local', ko: '근처', en: 'Nearby' },
  { value: 'regional', ko: '지역', en: 'Region' },
  { value: 'country', ko: '나라', en: 'Country' },
  { value: 'global', ko: '전세계', en: 'World' },
];

export function HotTagTicker({ topics, compact = false, locale = 'ko', scope = 'local', onScopeChange }: HotTagTickerProps) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const current = topics[index % Math.max(topics.length, 1)];

  useEffect(() => {
    if (topics.length <= 1) return undefined;
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % topics.length), 2_400);
    return () => window.clearInterval(interval);
  }, [topics.length]);

  if (topics.length === 0) {
    return (
      <div
        data-testid="hot-tag-ticker"
        className={`relative rounded-[14px] bg-white/95 text-sm font-bold text-[#5d5a51] ${
          compact ? 'h-full min-w-0 px-3 py-2' : 'z-[90] px-4 py-3 shadow-[2px_2px_0_rgba(35,35,31,0.72)]'
        }`}
      >
        {locale === 'ko' ? '지금 뜨는 태그를 모으는 중이에요.' : 'Collecting trending tags.'}
      </div>
    );
  }

  return (
    <div
      data-testid="hot-tag-ticker"
      className={`relative min-w-0 ${compact ? 'h-full' : 'z-[90] w-full'}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className={`w-full text-left transition-[transform,background-color,box-shadow] hover:bg-white active:scale-[0.96] ${
          compact
            ? 'h-full rounded-[12px] bg-white px-2.5 py-1.5'
            : 'rounded-[14px] bg-white/95 px-4 py-3 shadow-[2px_2px_0_rgba(35,35,31,0.72)]'
        }`}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className={`shrink-0 font-black text-[#252520] ${compact ? 'text-[11px]' : 'text-xs'}`}>{compact ? (locale === 'ko' ? '트렌드' : 'Trends') : (locale === 'ko' ? '지금 뜨는 태그' : 'Trending tags')}</span>
          <span className="relative min-w-0 flex-1 overflow-hidden text-right">
            <span
              key={`${current.normalizedKey}-${index}`}
              data-testid="hot-tag-current"
              className={`anigeunde-hot-tag-item inline-block max-w-full truncate font-black text-[#ef3b32] ${compact ? 'text-xs' : 'text-sm'}`}
            >
              {current.displayLabel}
            </span>
          </span>
        </div>
      </button>
      {expanded ? (
        <ol
          className={`anigeunde-hot-tag-list z-[150] grid gap-2 rounded-[14px] bg-white p-3 shadow-[3px_3px_0_rgba(35,35,31,0.78),0_0_0_1px_rgba(35,35,31,0.08)] ${
            compact ? 'absolute right-0 top-[calc(100%+0.5rem)] w-[min(72vw,320px)]' : 'relative mt-3'
          }`}
        >
          <li className="flex gap-1 rounded-lg bg-[#f5f5f5] p-1" role="group" aria-label={locale === 'ko' ? '트렌드 범위' : 'Trend scope'}>
            {scopeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => onScopeChange?.(option.value)}
                className={`min-h-7 min-w-0 flex-1 rounded-full px-1.5 text-[10px] font-black transition-[background-color,color,transform] active:scale-[0.96] ${scope === option.value ? 'bg-[#ef3b32] text-white' : 'bg-white text-[#6f6b61]'}`}
                aria-pressed={scope === option.value}
              >
                {locale === 'ko' ? option.ko : option.en}
              </button>
            ))}
          </li>
          {topics.slice(0, 10).map((topic, topicIndex) => (
            <li key={`${topic.scope}-${topic.normalizedKey}`} className={`${compact ? 'grid gap-0.5' : 'flex items-center justify-between gap-3'} rounded-lg bg-white px-3 py-2 text-xs text-[#5d5a51] shadow-[0_0_0_1px_rgba(35,35,31,0.08)]`}>
              <span className="break-words font-black">{topicIndex + 1}. {topic.displayLabel}</span>
              <span className={`${compact ? '' : 'shrink-0 text-right'} text-[#b52620]`}>{topic.heatLabel}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
