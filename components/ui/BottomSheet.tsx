'use client';

import { useEffect, useState, type FocusEvent, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type BottomSheetProps = PropsWithChildren<{
  footer?: ReactNode;
  open: boolean;
  title: string;
  onClose: () => void;
}>;

function useBottomSheetViewport(open: boolean) {
  const [metrics, setMetrics] = useState({ bottomInset: 0, height: 0, top: 0 });

  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height ?? window.innerHeight);
      const offsetTop = Math.round(viewport?.offsetTop ?? 0);
      const bottomInset = Math.max(0, Math.round(window.innerHeight - height - offsetTop));
      setMetrics({ bottomInset, height, top: offsetTop });
    };

    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open]);

  return metrics;
}

export function BottomSheet({ open, title, onClose, footer, children }: BottomSheetProps) {
  const { bottomInset, height, top } = useBottomSheetViewport(open);

  if (!open || typeof document === 'undefined') return null;

  const keepFocusedFieldVisible = (event: FocusEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    window.setTimeout(() => {
      if (!(event.target instanceof HTMLElement)) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = event.target.getBoundingClientRect();
      const topLimit = scrollerRect.top + 16;
      const bottomLimit = scrollerRect.bottom - 16;
      if (targetRect.top >= topLimit && targetRect.bottom <= bottomLimit) return;
      event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, 120);
  };

  const panelMaxHeight = height > 0 ? Math.floor(height * 0.6) : undefined;
  const dialogStyle = height > 0 ? { bottom: 'auto', height, top } : undefined;

  return createPortal(
    <div
      data-testid="bottom-sheet-dialog"
      className={`fixed inset-x-0 top-0 z-[220] flex h-dvh items-end justify-center lg:px-6 lg:pb-6 ${bottomInset > 0 ? 'bg-transparent' : 'bg-[#26251e]/28'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={dialogStyle}
    >
      <div
        data-testid="bottom-sheet-panel"
        className="publit-panel-enter flex max-h-[60dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white text-[#26251e] shadow-[3px_3px_0_rgba(35,35,31,0.78),0_0_0_1px_rgba(35,35,31,0.08)] lg:max-w-lg lg:rounded-xl"
        style={panelMaxHeight ? { maxHeight: panelMaxHeight } : undefined}
      >
        <div className="mx-5 mt-4 flex shrink-0 items-center justify-between gap-4 border-b border-[#e6e5e0] pb-3">
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
        <div
          data-testid="bottom-sheet-scroll"
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-20 px-5 pt-4 ${footer ? 'pb-4' : 'pb-[calc(env(safe-area-inset-bottom)+1.25rem)] lg:pb-6'}`}
          onFocusCapture={keepFocusedFieldVisible}
        >
          {children}
        </div>
        {footer ? (
          <div
            data-testid="bottom-sheet-footer"
            className="shrink-0 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-12px_18px_rgba(255,255,255,0.92)]"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
