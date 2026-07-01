'use client';

import type { ReportReason } from '@/lib/flame/types';
import { Button } from '@/components/ui/Button';

const reasons: Array<{ reason: ReportReason; label: string }> = [
  { reason: 'misinformation', label: '오정보' },
  { reason: 'doxxing', label: '신상공개' },
  { reason: 'violence', label: '폭력 유도' },
  { reason: 'hate', label: '혐오' },
  { reason: 'spam', label: '스팸' },
  { reason: 'privacy', label: '사생활 침해' },
  { reason: 'other', label: '기타' },
];

type ReportDialogProps = {
  open: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason) => void;
};

export function ReportDialog({ open, onClose, onReport }: ReportDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-[#26251e]/55 px-4" role="dialog" aria-modal="true" aria-label="신고">
      <div className="publit-panel-enter w-full max-w-sm rounded-xl bg-white p-5 text-[#26251e] shadow-[3px_3px_0_rgba(35,35,31,0.82),0_0_0_1px_rgba(35,35,31,0.08)]">
        <h3 className="text-base font-semibold text-[#26251e]">신고 사유</h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {reasons.map((item) => (
            <button
              type="button"
              key={item.reason}
              onClick={() => onReport(item.reason)}
              className="min-h-11 rounded-lg border border-[#e6e5e0] bg-white px-3 text-xs font-semibold text-[#5a5852] transition-[transform,background-color] hover:bg-[#f5f5f5] active:scale-[0.97]"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}
