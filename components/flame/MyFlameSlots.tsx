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
    <section className="rounded-xl bg-white/[0.06] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#f7efe3]">내 live 불꽃</h3>
        <span className="font-mono text-sm tabular-nums text-[#ffe27a]">{used} / {limit}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {(slots?.activeFlames ?? []).map((flame) => (
          <div key={flame.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/18 px-3 py-2">
            <span className="min-w-0 truncate text-sm text-[#d9e5ef]">{flame.tagLabel} · live</span>
            <Button variant="ghost" className="px-2 text-xs" onClick={() => onExtinguish(flame.id)}>끄기</Button>
          </div>
        ))}
        {Array.from({ length: Math.max(0, limit - used) }).map((_, index) => (
          <div key={`empty-${index}`} className="rounded-lg bg-black/12 px-3 py-2 text-sm text-[#667789]">빈 슬롯</div>
        ))}
      </div>
    </section>
  );
}
