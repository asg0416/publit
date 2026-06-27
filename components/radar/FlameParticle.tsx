import type { FlameParticle as FlameParticleType } from '@/lib/flame/types';

type FlameParticleProps = {
  particle: FlameParticleType;
  onClick: () => void;
};

const heatClass = {
  fresh: 'bg-[#ff9a3d] shadow-[0_0_18px_rgba(255,154,61,0.48)]',
  warming: 'bg-[#ffe27a] shadow-[0_0_24px_rgba(255,226,122,0.56)]',
  hot: 'bg-[#fff4c4] shadow-[0_0_34px_rgba(255,244,196,0.72)]',
  cluster: 'bg-[#fff4c4] shadow-[0_0_38px_rgba(215,92,255,0.72)]',
};

export function FlameParticle({ particle, onClick }: FlameParticleProps) {
  const size = particle.selfStrength === 1 ? 38 : particle.selfStrength === 2 ? 46 : 56;
  const opacity = particle.lifecycle === 'live' ? 'opacity-100' : particle.lifecycle === 'ember' ? 'opacity-60' : 'opacity-35';

  return (
    <button
      type="button"
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-[10px] font-bold text-[#1b1208] transition-[transform,opacity] active:scale-[0.96] ${opacity}`}
      style={{ left: particle.x, top: particle.y, width: size, height: size }}
      onClick={onClick}
      data-testid="flame-particle"
      aria-label={`${particle.tagLabel} 불꽃`}
    >
      <span className={`grid h-full w-full place-items-center rounded-full ${heatClass[particle.heatLevel]}`}>
        <span className="max-w-[4.6rem] translate-y-8 whitespace-nowrap rounded-full bg-black/45 px-2 py-1 text-[#f7efe3]">
          {particle.tagLabel}
        </span>
      </span>
    </button>
  );
}
