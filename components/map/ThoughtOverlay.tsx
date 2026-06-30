'use client';

import { useEffect, useMemo, useState } from 'react';
import { createInitialParticles, simulateParticles, summarizeClusters } from '@/lib/flame/particleSimulation';
import type { Flame, FlameParticle as FlameParticleType } from '@/lib/flame/types';
import { CHARACTER_EMOJI, characterKeyForThought } from './character';
import { RangeCircle } from './RangeCircle';

type ThoughtOverlayProps = {
  thoughts: Flame[];
  rangeLabel: string;
  onSelect: (thought: Flame) => void;
};

const overlaySize = 320;

function strengthTagClass(strength: FlameParticleType['selfStrength']) {
  if (strength === 3) return 'bg-[#ff8aa0] text-[#4a1020] shadow-[1px_1px_0_rgba(207,45,86,0.62)]';
  if (strength === 2) return 'bg-[#ffda68] text-[#252520] shadow-[1px_1px_0_rgba(109,78,0,0.46)]';
  return 'bg-white text-[#252520] shadow-[1px_1px_0_rgba(35,35,31,0.68)]';
}

function isGlittery(heatLevel: FlameParticleType['heatLevel']) {
  return heatLevel === 'hot' || heatLevel === 'cluster';
}

export function ThoughtOverlay({ thoughts, rangeLabel, onSelect }: ThoughtOverlayProps) {
  const overlayKey = thoughts.map((thought) => `${thought.id}:${thought.tagNormalized}:${thought.characterKey ?? ''}`).join('|');

  return (
    <ThoughtOverlaySimulation
      key={overlayKey}
      thoughts={thoughts}
      rangeLabel={rangeLabel}
      onSelect={onSelect}
    />
  );
}

function ThoughtOverlaySimulation({ thoughts, rangeLabel, onSelect }: ThoughtOverlayProps) {
  const initial = useMemo(() => createInitialParticles(thoughts, overlaySize), [thoughts]);
  const [particles, setParticles] = useState<FlameParticleType[]>(initial);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => {
      setParticles((current) => simulateParticles(current, overlaySize, 2));
    }, 96);
    return () => window.clearInterval(interval);
  }, []);

  const clusters = summarizeClusters(particles);

  return (
    <section data-testid="thought-overlay" className="pointer-events-none absolute inset-x-2 bottom-[12rem] top-[6.35rem] z-10 grid place-items-center">
      <div className="relative size-[min(78vw,320px)] max-h-[320px] max-w-[320px]" data-testid="thought-map">
        <RangeCircle label={rangeLabel} />
        {clusters.map((cluster) => (
          <div
            key={cluster.tagNormalized}
            data-testid="cluster-aura"
            className="anigeunde-aura absolute size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffdb68]/25"
            style={{ left: `${(cluster.x / overlaySize) * 100}%`, top: `${(cluster.y / overlaySize) * 100}%` }}
          />
        ))}
        {particles.map((particle) => {
          const thought = thoughts.find((item) => item.id === particle.flameId);
          if (!thought) return null;
          const characterKey = characterKeyForThought({
            id: thought.id,
            tagNormalized: thought.tagNormalized,
            characterKey: thought.characterKey,
          });

          return (
            <div
              key={particle.id}
              className="pointer-events-none absolute grid w-16 -translate-x-1/2 -translate-y-1/2 justify-items-center gap-1 text-[9px] font-black text-[#252520]"
              style={{ left: `${(particle.x / overlaySize) * 100}%`, top: `${(particle.y / overlaySize) * 100}%` }}
            >
              <span
                data-testid="thought-tag-label"
                data-strength={particle.selfStrength}
                className={`pointer-events-none max-w-[4rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-2 py-1 ${strengthTagClass(particle.selfStrength)}`}
              >
                {particle.tagLabel}
              </span>
              <button
                type="button"
                data-testid="thought-character"
                className="pointer-events-auto grid size-9 place-items-center transition-transform active:scale-[0.94]"
                onClick={() => onSelect(thought)}
                aria-label={`${particle.tagLabel} 생각`}
              >
                <span
                  data-testid="flame-particle"
                  className="contents"
                >
                  <span
                    data-testid="flame-glyph"
                    data-heat-level={particle.heatLevel}
                    className={`anigeunde-character grid size-9 place-items-center rounded-[10px] bg-white text-xl shadow-[1px_1px_0_rgba(35,35,31,0.68)] ${
                      isGlittery(particle.heatLevel) ? 'anigeunde-glitter' : ''
                    }`}
                  >
                    {CHARACTER_EMOJI[characterKey]}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
