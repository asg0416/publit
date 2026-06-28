'use client';

import { useState } from 'react';
import type { Flame, ReactionType, ReportReason } from '@/lib/flame/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReactionBar } from './ReactionBar';
import { ReportDialog } from './ReportDialog';

type FlameDetailSheetProps = {
  flame: Flame | null;
  onClose: () => void;
  onReact: (flameId: string, reaction: ReactionType) => void;
  onReport: (flameId: string, reason: ReportReason) => void;
};

export function FlameDetailSheet({ flame, onClose, onReact, onReport }: FlameDetailSheetProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <BottomSheet open={Boolean(flame)} title={flame?.tagLabel ?? '불꽃'} onClose={onClose}>
        {flame ? (
          <div className="grid gap-4">
            <div>
              <p className="text-lg font-semibold text-[#f54e00]">{flame.tagLabel}</p>
              {flame.text ? <p className="mt-3 text-base leading-7 text-[#26251e]">{flame.text}</p> : <p className="mt-3 text-sm text-[#807d72]">이 흔적은 본문 없이 공간의 분위기로만 남아 있어요.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{flame.mood}</Badge>
              <Badge>강도 {flame.selfStrength}</Badge>
              <Badge>{flame.lifecycle}</Badge>
            </div>
            <p className="rounded-lg bg-[#f54e00]/10 px-4 py-3 text-sm font-semibold text-[#8a2d00]">{flame.heatLabel}</p>
            {flame.lifecycle !== 'trace' ? <ReactionBar onReact={(reaction) => onReact(flame.id, reaction)} /> : null}
            <Button variant="secondary" onClick={() => setReportOpen(true)}>신고</Button>
          </div>
        ) : null}
      </BottomSheet>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReport={(reason) => {
          if (flame) onReport(flame.id, reason);
          setReportOpen(false);
        }}
      />
    </>
  );
}
