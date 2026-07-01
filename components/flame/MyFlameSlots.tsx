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
    <section className="rounded-[14px] bg-white p-4 shadow-[1px_1px_0_rgba(35,35,31,0.45)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#252520]">내 생각</h3>
        <span className="font-mono text-sm tabular-nums text-[#6f6b61]">{used} / {limit}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {(slots?.activeFlames ?? []).map((flame) => (
          <div key={flame.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-[0_0_0_1px_rgba(35,35,31,0.08)]">
            <span className="min-w-0 truncate text-sm text-[#5d5a51]">{flame.tagLabel} · 지금 떠 있음</span>
            <Button type="button" variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => onExtinguish(flame.id)}>내리기</Button>
          </div>
        ))}
        {Array.from({ length: Math.max(0, limit - used) }).map((_, index) => (
          <div key={`empty-${index}`} className="rounded-lg border border-dashed border-[#e7e5df] bg-white px-3 py-2 text-sm text-[#9a968c]">빈 슬롯</div>
        ))}
      </div>
    </section>
  );
}
