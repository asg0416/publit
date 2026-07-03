'use client';

import type { ReactionSummaryItem, ReactionType } from '@/lib/flame/types';

const fallbackReactions: ReactionSummaryItem[] = [
  { type: 'similar', label: '어 나도', count: 0, reacted: false },
  { type: 'curious', label: '궁금', count: 0, reacted: false },
  { type: 'neutral', label: '중립', count: 0, reacted: false },
  { type: 'disagree', label: '별로', count: 0, reacted: false },
  { type: 'watching', label: '관망 중', count: 0, reacted: false },
];

type ReactionBarProps = {
  reactions?: ReactionSummaryItem[];
  onReact: (reaction: ReactionType) => void;
};

export function ReactionBar({ reactions = fallbackReactions, onReact }: ReactionBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {reactions.map((reaction) => (
        <button
          type="button"
          key={reaction.type}
          onClick={() => {
            if (!reaction.reacted) onReact(reaction.type);
          }}
          className={`grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 text-xs font-black shadow-[1px_1px_0_rgba(35,35,31,0.42),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color,color] active:scale-[0.96] ${
            reaction.reacted ? 'bg-[#ef3b32] text-white' : 'bg-white text-[#5a5852] hover:bg-[#f5f5f5]'
          }`}
          aria-pressed={reaction.reacted}
          aria-disabled={reaction.reacted}
        >
          <span className="min-w-0 truncate text-left">{reaction.label}</span>
          <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
            reaction.reacted ? 'bg-white text-[#ef3b32]' : 'bg-[#f5f5f5] text-[#252520]'
          }`}>
            {reaction.count}
          </span>
        </button>
      ))}
    </div>
  );
}
