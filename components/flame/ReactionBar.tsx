'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
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
  onReact: (reaction: ReactionType, reactionLabel?: string) => void;
};

export function ReactionBar({ reactions = fallbackReactions, onReact }: ReactionBarProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = customLabel.trim().replace(/\s+/g, ' ');
    if (!label || label.length > 18) return;
    onReact('custom', label);
    setCustomLabel('');
    setCustomOpen(false);
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {reactions.map((reaction) => (
        <button
          type="button"
          key={`${reaction.type}-${reaction.label}`}
          onClick={() => {
            if (!reaction.reacted) onReact(reaction.type, reaction.custom ? reaction.label : undefined);
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
      {customOpen ? (
        <form className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:col-span-3" onSubmit={handleCustomSubmit}>
          <label className="sr-only" htmlFor="custom-reaction-label">직접 반응</label>
          <input
            id="custom-reaction-label"
            value={customLabel}
            maxLength={18}
            onChange={(event) => setCustomLabel(event.target.value)}
            className="min-h-11 min-w-0 rounded-lg border border-[#d5d2c8] bg-white px-3 text-xs font-black text-[#252520] outline-none transition-[border-color,box-shadow] placeholder:text-[#9a968c] focus:border-[#ef3b32] focus:shadow-[0_0_0_3px_rgba(239,59,50,0.14)]"
            placeholder="내 반응 문구"
            autoFocus
          />
          <button
            type="submit"
            disabled={!customLabel.trim()}
            className="min-h-11 rounded-lg bg-[#ef3b32] px-3 text-xs font-black text-white shadow-[1px_1px_0_rgba(35,35,31,0.42)] transition-[transform,opacity] active:scale-[0.96] disabled:opacity-45"
          >
            추가
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-[#5a5852] shadow-[1px_1px_0_rgba(35,35,31,0.42),0_0_0_1px_rgba(35,35,31,0.08)] transition-[transform,background-color,color] hover:bg-[#f5f5f5] active:scale-[0.96] sm:col-span-1"
          aria-label="반응 추가"
        >
          <Plus size={15} />
          <span className="min-w-0 truncate text-left">반응 추가</span>
        </button>
      )}
    </div>
  );
}
