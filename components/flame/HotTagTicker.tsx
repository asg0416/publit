'use client';

import { useEffect, useState } from 'react';
import type { HotTopic } from '@/lib/flame/types';

type HotTagTickerProps = {
  topics: HotTopic[];
};

export function HotTagTicker({ topics }: HotTagTickerProps) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (topics.length <= 1) return undefined;
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % topics.length), 2_000);
    return () => window.clearInterval(interval);
  }, [topics.length]);

  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-[#e6e5e0] bg-white px-4 py-3 text-sm text-[#5a5852]">
        지금 뜨거운 불꽃을 모으는 중이에요.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      className="w-full rounded-lg border border-[#e6e5e0] bg-white px-4 py-3 text-left transition-[background-color] hover:bg-[#fafaf7]"
      aria-expanded={expanded}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#807d72]">지금 뜨거운 불꽃</span>
        <span className="publit-ticker-snap text-sm font-semibold text-[#f54e00]">{topics[index]?.displayLabel}</span>
      </div>
      {expanded ? (
        <ol className="mt-3 grid gap-2">
          {topics.slice(0, 10).map((topic, topicIndex) => (
            <li key={`${topic.scope}-${topic.normalizedKey}`} className="flex items-center justify-between gap-3 text-xs text-[#5a5852]">
              <span>{topicIndex + 1}. {topic.displayLabel}</span>
              <span className="text-right text-[#807d72]">{topic.heatLabel}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </button>
  );
}
