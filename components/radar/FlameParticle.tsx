import { Flame } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { FlameParticle as FlameParticleType } from '@/lib/flame/types';

type FlameParticleProps = {
  particle: FlameParticleType;
  showLabel?: boolean;
  onClick: () => void;
};

const heatClass = {
  fresh: 'text-[#f54e00] drop-shadow-[0_0_12px_rgba(245,78,0,0.85)]',
  warming: 'text-[#f6ad3f] drop-shadow-[0_0_15px_rgba(246,173,63,0.85)]',
  hot: 'text-[#fff1bd] drop-shadow-[0_0_18px_rgba(255,241,189,0.95)]',
  cluster: 'text-[#fff1bd] drop-shadow-[0_0_22px_rgba(192,168,221,0.95)]',
};

const haloClass = {
  fresh: 'bg-[#f54e00]',
  warming: 'bg-[#f6ad3f]',
  hot: 'bg-[#fff1bd]',
  cluster: 'bg-[#c0a8dd]',
};

function flameDelay(particle: FlameParticleType) {
  const seed = Array.from(particle.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${(seed % 11) / 10}s`;
}

export function FlameParticle({ particle, showLabel = true, onClick }: FlameParticleProps) {
  const size = particle.selfStrength === 1 ? 38 : particle.selfStrength === 2 ? 46 : 56;
  const opacity = particle.lifecycle === 'live' ? 'opacity-100' : particle.lifecycle === 'ember' ? 'opacity-65' : 'opacity-40';
  const style = {
    left: particle.x,
    top: particle.y,
    width: Math.max(86, size + 40),
    minHeight: size + 30,
    '--flame-delay': flameDelay(particle),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`publit-flame-button absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-[10px] font-semibold text-[#26251e] transition-[opacity] ${opacity}`}
      style={style}
      onClick={onClick}
      data-testid="flame-particle"
      aria-label={`${particle.tagLabel} 불꽃`}
    >
      <span
        data-testid="flame-glyph"
        className={`publit-flame-float relative grid place-items-center ${heatClass[particle.heatLevel]}`}
        style={{ width: size, height: size }}
      >
        <span className={`publit-heat-shimmer absolute inset-0 rounded-full ${haloClass[particle.heatLevel]} opacity-25 blur-md`} />
        <Flame className="publit-flame-flicker relative" size={size} fill="currentColor" strokeWidth={1.35} aria-hidden="true" />
      </span>
      {showLabel ? (
        <span className="mt-1 max-w-[5.4rem] whitespace-nowrap rounded-full border border-white/10 bg-[#26251e]/78 px-2 py-1 text-[#f7f7f4] backdrop-blur-sm">
          {particle.tagLabel}
        </span>
      ) : null}
    </button>
  );
}
