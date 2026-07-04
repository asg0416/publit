'use client';

import type { FocusEvent, PropsWithChildren } from 'react';
import { X } from 'lucide-react';

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  const keepFocusedFieldVisible = (event: FocusEvent<HTMLDivElement>) => {
    window.setTimeout(() => {
      if (!(event.target instanceof HTMLElement)) return;
      event.target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-[#26251e]/28 lg:px-6 lg:pb-6" role="dialog" aria-modal="true" aria-label={title}>
      <div
        data-testid="bottom-sheet-panel"
        className="publit-panel-enter max-h-[60dvh] w-full overflow-y-auto overscroll-contain scroll-py-20 rounded-t-xl bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 text-[#26251e] shadow-[3px_3px_0_rgba(35,35,31,0.78),0_0_0_1px_rgba(35,35,31,0.08)] lg:max-w-lg lg:rounded-xl lg:pb-6"
        onFocusCapture={keepFocusedFieldVisible}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#e6e5e0] pb-3">
          <h2 className="text-base font-semibold text-[#26251e]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg border border-[#e6e5e0] bg-white text-[#26251e] transition-[transform,background-color] active:scale-[0.97]"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
