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
      <div className="relative z-[90] rounded-[14px] bg-white/95 px-4 py-3 text-sm font-bold text-[#5d5a51] shadow-[2px_2px_0_rgba(35,35,31,0.72)]">
        지금 뜨는 태그를 모으는 중이에요.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      className="relative z-[90] w-full rounded-[14px] bg-white/95 px-4 py-3 text-left shadow-[2px_2px_0_rgba(35,35,31,0.72)] transition-[transform,background-color] hover:bg-white active:scale-[0.96]"
      aria-expanded={expanded}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-xs font-black text-[#6f6b61]">지금 뜨는 태그</span>
        <span className="publit-ticker-snap min-w-0 truncate text-sm font-black text-[#0b6975]">{topics[index]?.displayLabel}</span>
      </div>
      {expanded ? (
        <ol className="relative z-[91] mt-3 grid gap-2">
          {topics.slice(0, 10).map((topic, topicIndex) => (
            <li key={`${topic.scope}-${topic.normalizedKey}`} className="flex items-center justify-between gap-3 text-xs text-[#5d5a51]">
              <span>{topicIndex + 1}. {topic.displayLabel}</span>
              <span className="text-right text-[#6f6b61]">{topic.heatLabel}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </button>
  );
}
