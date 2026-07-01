'use client';

import { useRef, useState } from 'react';
import type { Flame, ReactionType, ReportReason } from '@/lib/flame/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { emojiForThought } from '@/components/map/character';
import { thoughtToneForFlame } from './thoughtTone';
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
  const [swipeDirection, setSwipeDirection] = useState<'idle' | 'forward' | 'back'>('idle');
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeFlame = flame ? flames.find((item) => item.id === flame.id) ?? flame : null;
  const currentIndex = activeFlame ? flames.findIndex((item) => item.id === activeFlame.id) : -1;
  const canSwipe = currentIndex >= 0 && flames.length > 1;
  const activeTone = activeFlame ? thoughtToneForFlame(activeFlame) : null;

  const goTo = (direction: -1 | 1) => {
    if (!canSwipe) return;
    const nextIndex = (currentIndex + direction + flames.length) % flames.length;
    setDragOffset(0);
    setSwipeDirection(direction > 0 ? 'forward' : 'back');
    onSelect(flames[nextIndex]);
  };

  const handleClose = () => {
    setDragOffset(0);
    setSwipeDirection('idle');
    onClose();
  };

  const handleDragEnd = (end: number | undefined) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || end === undefined) {
      setDragOffset(0);
      return;
    }

    const delta = end - start;
    setDragOffset(0);
    if (Math.abs(delta) < 56) return;
    goTo(delta < 0 ? 1 : -1);
  };

  return (
    <>
      <BottomSheet open={Boolean(activeFlame)} title={activeFlame?.tagLabel ?? '생각'} onClose={handleClose}>
        {activeFlame ? (
          <div className="grid gap-4">
            <section
              data-testid="thought-detail-swipe-area"
              className="grid gap-2"
              onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null;
                setDragOffset(0);
              }}
              onTouchMove={(event) => {
                const start = touchStartX.current;
                const current = event.touches[0]?.clientX;
                if (start === null || current === undefined) return;
                const delta = Math.max(-96, Math.min(96, current - start));
                setDragOffset(delta);
              }}
              onTouchEnd={(event) => {
                handleDragEnd(event.changedTouches[0]?.clientX);
              }}
              onTouchCancel={() => {
                touchStartX.current = null;
                setDragOffset(0);
              }}
            >
              <div
                key={activeFlame.id}
                data-testid="thought-speech-bubble"
                data-dragging={dragOffset !== 0 ? 'true' : undefined}
                style={dragOffset !== 0 ? {
                  opacity: 1 - Math.min(Math.abs(dragOffset) / 260, 0.22),
                  transform: `translateX(${dragOffset}px) rotate(${dragOffset / 32}deg)`,
                } : undefined}
                className={`relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[22px] p-3 ${dragOffset !== 0 ? 'transition-none' : 'transition-[opacity,transform] duration-150'} ${activeTone?.bubbleClassName ?? 'bg-white shadow-[2px_2px_0_rgba(35,35,31,0.72)]'} ${
                  isGlittery(activeFlame.heatLabel) ? 'anigeunde-glitter' : ''
                } ${swipeDirection === 'forward' ? 'anigeunde-swipe-card-forward' : ''} ${swipeDirection === 'back' ? 'anigeunde-swipe-card-back' : ''}`}
              >
                <span className="grid size-12 place-items-center rounded-[16px] bg-white text-2xl shadow-[1px_1px_0_rgba(35,35,31,0.52)]">
                  {emojiForThought({
                    id: activeFlame.id,
                    tagNormalized: activeFlame.tagNormalized,
                    characterKey: activeFlame.characterKey,
                    characterEmoji: activeFlame.characterEmoji,
                  })}
                </span>
                <p className="self-center text-pretty text-base font-black leading-7 text-inherit">
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
              <Badge>{activeTone?.fullLabel ?? '반짝 생각남'}</Badge>
              <Badge>{lifecycleLabels[activeFlame.lifecycle]}</Badge>
            </div>
            <p className="rounded-lg bg-[#ef3b32]/10 px-4 py-3 text-sm font-black text-[#b52620]">{displayHeatLabel(activeFlame.heatLabel)}</p>
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
