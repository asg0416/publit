'use client';

import type { ReactionType } from '@/lib/flame/types';

const reactions: Array<{ type: ReactionType; label: string }> = [
  { type: 'similar', label: '나도 비슷해요' },
  { type: 'curious', label: '궁금해요' },
  { type: 'need_source', label: '자료가 필요해요' },
  { type: 'watching', label: '조용히 지켜볼게요' },
];

type ReactionBarProps = {
  onReact: (reaction: ReactionType) => void;
};

export function ReactionBar({ onReact }: ReactionBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {reactions.map((reaction) => (
        <button
          type="button"
          key={reaction.type}
          onClick={() => onReact(reaction.type)}
          className="min-h-11 rounded-lg bg-white/10 px-3 text-xs font-semibold text-[#d9e5ef] transition-[transform,opacity] active:scale-[0.96]"
        >
          {reaction.label}
        </button>
      ))}
    </div>
  );
}
