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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4" role="dialog" aria-modal="true" aria-label="신고">
      <div className="w-full max-w-sm rounded-2xl bg-[#101821] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.52)]">
        <h3 className="text-base font-bold text-[#f7efe3]">신고 사유</h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {reasons.map((item) => (
            <button
              type="button"
              key={item.reason}
              onClick={() => onReport(item.reason)}
              className="min-h-11 rounded-lg bg-white/10 px-3 text-xs font-semibold text-[#d9e5ef] transition-[transform,opacity] active:scale-[0.96]"
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
