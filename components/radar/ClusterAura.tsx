import type { ClusterSummary } from '@/lib/flame/types';

type ClusterAuraProps = {
  cluster: ClusterSummary;
};

export function ClusterAura({ cluster }: ClusterAuraProps) {
  return (
    <div
      className="publit-aura-pulse pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c0a8dd]/18 shadow-[0_0_42px_rgba(192,168,221,0.42)]"
      style={{ left: cluster.x, top: cluster.y, width: 94, height: 94 }}
      data-testid="cluster-aura"
    >
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-9 whitespace-nowrap rounded-full border border-white/10 bg-[#26251e]/72 px-2 py-1 text-[10px] font-semibold text-[#f7f7f4] backdrop-blur-sm">
        {cluster.tagLabel}
      </span>
    </div>
  );
}
