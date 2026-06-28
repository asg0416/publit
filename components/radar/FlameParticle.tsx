import { Flame } from 'lucide-react';
import type { FlameParticle as FlameParticleType } from '@/lib/flame/types';

type FlameParticleProps = {
  particle: FlameParticleType;
  onClick: () => void;
};

const heatClass = {
  fresh: 'text-[#ff9a3d] drop-shadow-[0_0_12px_rgba(255,154,61,0.75)]',
  warming: 'text-[#ffe27a] drop-shadow-[0_0_15px_rgba(255,226,122,0.78)]',
  hot: 'text-[#fff4c4] drop-shadow-[0_0_18px_rgba(255,244,196,0.9)]',
  cluster: 'text-[#fff4c4] drop-shadow-[0_0_20px_rgba(215,92,255,0.88)]',
};

const haloClass = {
  fresh: 'bg-[#ff9a3d]',
  warming: 'bg-[#ffe27a]',
  hot: 'bg-[#fff4c4]',
  cluster: 'bg-[#d75cff]',
};

export function FlameParticle({ particle, onClick }: FlameParticleProps) {
  const size = particle.selfStrength === 1 ? 38 : particle.selfStrength === 2 ? 46 : 56;
  const opacity = particle.lifecycle === 'live' ? 'opacity-100' : particle.lifecycle === 'ember' ? 'opacity-60' : 'opacity-35';

  return (
    <button
      type="button"
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-[10px] font-bold text-[#1b1208] transition-[transform,opacity] active:scale-[0.96] ${opacity}`}
      style={{ left: particle.x, top: particle.y, width: Math.max(86, size + 40), minHeight: size + 30 }}
      onClick={onClick}
      data-testid="flame-particle"
      aria-label={`${particle.tagLabel} 불꽃`}
    >
      <span
        data-testid="flame-glyph"
        className={`relative grid place-items-center ${heatClass[particle.heatLevel]}`}
        style={{ width: size, height: size }}
      >
        <span className={`absolute inset-1 rounded-full ${haloClass[particle.heatLevel]} opacity-20 blur-md`} />
        <Flame className="relative" size={size} fill="currentColor" strokeWidth={1.35} aria-hidden="true" />
      </span>
      <span className="mt-1 max-w-[5.4rem] whitespace-nowrap rounded-full bg-black/50 px-2 py-1 text-[#f7efe3] shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
        {particle.tagLabel}
      </span>
    </button>
  );
}
