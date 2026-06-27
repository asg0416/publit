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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/48 backdrop-blur-sm lg:px-6 lg:pb-6" role="dialog" aria-modal="true" aria-label={title}>
      <div data-testid="bottom-sheet-panel" className="max-h-[86vh] w-full overflow-y-auto rounded-t-2xl bg-[#101821] px-5 pb-6 pt-4 shadow-[0_-18px_60px_rgba(0,0,0,0.46)] lg:max-w-lg lg:rounded-2xl lg:shadow-[0_24px_90px_rgba(0,0,0,0.52)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f7efe3]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg bg-white/8 text-[#d9e5ef] transition-[transform,opacity] active:scale-[0.96]"
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
