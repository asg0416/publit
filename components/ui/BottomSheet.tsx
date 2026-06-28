import type { PropsWithChildren } from 'react';
import { X } from 'lucide-react';

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#26251e]/45 backdrop-blur-sm lg:px-6 lg:pb-6" role="dialog" aria-modal="true" aria-label={title}>
      <div data-testid="bottom-sheet-panel" className="publit-panel-enter max-h-[88vh] w-full overflow-y-auto rounded-t-xl border border-[#cfcdc4] bg-[#fafaf7] px-5 pb-6 pt-4 text-[#26251e] lg:max-w-lg lg:rounded-xl">
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
