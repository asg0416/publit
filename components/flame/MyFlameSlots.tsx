'use client';

import { Button } from '@/components/ui/Button';

type MyFlameSlotsProps = {
  slots: {
    used: number;
    limit: number;
    activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }>;
  } | null;
  onExtinguish: (flameId: string) => void;
};

export function MyFlameSlots({ slots, onExtinguish }: MyFlameSlotsProps) {
  const used = slots?.used ?? 0;
  const limit = slots?.limit ?? 3;

  return (
    <section className="rounded-lg border border-[#e6e5e0] bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#26251e]">내 live 불꽃</h3>
        <span className="font-mono text-sm tabular-nums text-[#c08532]">{used} / {limit}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {(slots?.activeFlames ?? []).map((flame) => (
          <div key={flame.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#fafaf7] px-3 py-2">
            <span className="min-w-0 truncate text-sm text-[#5a5852]">{flame.tagLabel} · live</span>
            <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => onExtinguish(flame.id)}>끄기</Button>
          </div>
        ))}
        {Array.from({ length: Math.max(0, limit - used) }).map((_, index) => (
          <div key={`empty-${index}`} className="rounded-lg border border-dashed border-[#e6e5e0] bg-[#fafaf7] px-3 py-2 text-sm text-[#a09c92]">빈 슬롯</div>
        ))}
      </div>
    </section>
  );
}
