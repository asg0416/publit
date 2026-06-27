import type { ClusterSummary } from '@/lib/flame/types';

type ClusterAuraProps = {
  cluster: ClusterSummary;
};

export function ClusterAura({ cluster }: ClusterAuraProps) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d75cff]/14 shadow-[0_0_36px_rgba(215,92,255,0.35)]"
      style={{ left: cluster.x, top: cluster.y, width: 86, height: 86 }}
      data-testid="cluster-aura"
    >
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-8 whitespace-nowrap rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-[#f7efe3]">
        {cluster.tagLabel}
      </span>
    </div>
  );
}
