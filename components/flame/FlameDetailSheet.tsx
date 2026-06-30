'use client';

import { useRef, useState } from 'react';
import type { Flame, ReactionType, ReportReason } from '@/lib/flame/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CHARACTER_EMOJI, characterKeyForThought } from '@/components/map/character';
import { ReactionBar } from './ReactionBar';
import { ReportDialog } from './ReportDialog';

type FlameDetailSheetProps = {
  flame: Flame | null;
  flames: Flame[];
  onClose: () => void;
  onSelect: (flame: Flame) => void;
  onReact: (flameId: string, reaction: ReactionType) => void;
  onReport: (flameId: string, reason: ReportReason) => void;
};

const moodLabels: Record<Flame['mood'], string> = {
  quiet: '조용한 생각',
  curious: '궁금한 생각',
  serious: '진지한 생각',
  want_talk: '나누고 싶은 생각',
};

const lifecycleLabels: Record<Flame['lifecycle'], string> = {
  live: '방금 떠 있음',
  ember: '잔잔히 남음',
  trace: '분위기로 남음',
};

const strengthLabels: Record<Flame['selfStrength'], string> = {
  1: '기본',
  2: '엠버',
  3: '레드',
};

function strengthBubbleClass(strength: Flame['selfStrength']) {
  if (strength === 3) return 'bg-[#ffe2e4] shadow-[2px_2px_0_rgba(207,45,86,0.52)]';
  if (strength === 2) return 'bg-[#fff0bd] shadow-[2px_2px_0_rgba(109,78,0,0.42)]';
  return 'bg-white shadow-[2px_2px_0_rgba(35,35,31,0.58)]';
}

function displayHeatLabel(label: string) {
  return label
    .replace('방금 켜진 불꽃', '방금 떠오른 생각')
    .replaceAll('불꽃', '생각');
}

function isGlittery(label: string) {
  return label.includes('이야기') || label.includes('자주');
}

export function FlameDetailSheet({ flame, flames, onClose, onSelect, onReact, onReport }: FlameDetailSheetProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeFlame = flame ? flames.find((item) => item.id === flame.id) ?? flame : null;
  const currentIndex = activeFlame ? flames.findIndex((item) => item.id === activeFlame.id) : -1;
  const canSwipe = currentIndex >= 0 && flames.length > 1;

  const goTo = (direction: -1 | 1) => {
    if (!canSwipe) return;
    const nextIndex = (currentIndex + direction + flames.length) % flames.length;
    onSelect(flames[nextIndex]);
  };

  return (
    <>
      <BottomSheet open={Boolean(activeFlame)} title={activeFlame?.tagLabel ?? '생각'} onClose={onClose}>
        {activeFlame ? (
          <div className="grid gap-4">
            <section
              data-testid="thought-detail-swipe-area"
              className="grid gap-2"
              onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const start = touchStartX.current;
                touchStartX.current = null;
                const end = event.changedTouches[0]?.clientX;
                if (start === null || end === undefined) return;
                const delta = end - start;
                if (Math.abs(delta) < 56) return;
                goTo(delta < 0 ? 1 : -1);
              }}
            >
              <div
                data-testid="thought-speech-bubble"
                className={`relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[22px] p-3 ${strengthBubbleClass(activeFlame.selfStrength)} ${
                  isGlittery(activeFlame.heatLabel) ? 'anigeunde-glitter' : ''
                }`}
              >
                <span className="grid size-12 place-items-center rounded-[16px] bg-white text-2xl shadow-[1px_1px_0_rgba(35,35,31,0.52)]">
                  {CHARACTER_EMOJI[characterKeyForThought({
                    id: activeFlame.id,
                    tagNormalized: activeFlame.tagNormalized,
                    characterKey: activeFlame.characterKey,
                  })]}
                </span>
                <p className="self-center text-pretty text-base font-black leading-7 text-[#252520]">
                  {activeFlame.text ?? '이 생각은 본문 없이 공간의 분위기로만 남아 있어요.'}
                </p>
              </div>
              {canSwipe ? (
                <p className="text-center text-[10px] font-black text-[#6f6b61]">
                  {currentIndex + 1} / {flames.length}
                </p>
              ) : null}
            </section>
            <div className="flex flex-wrap gap-2">
              <Badge>{moodLabels[activeFlame.mood]}</Badge>
              <Badge>{strengthLabels[activeFlame.selfStrength]}</Badge>
              <Badge>{lifecycleLabels[activeFlame.lifecycle]}</Badge>
            </div>
            <p className="rounded-lg bg-[#ffda68]/35 px-4 py-3 text-sm font-black text-[#6d4e00]">{displayHeatLabel(activeFlame.heatLabel)}</p>
            {activeFlame.lifecycle !== 'trace' ? <ReactionBar onReact={(reaction) => onReact(activeFlame.id, reaction)} /> : null}
            <Button variant="secondary" onClick={() => setReportOpen(true)}>신고</Button>
          </div>
        ) : null}
      </BottomSheet>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReport={(reason) => {
          if (activeFlame) onReport(activeFlame.id, reason);
          setReportOpen(false);
        }}
      />
    </>
  );
}
