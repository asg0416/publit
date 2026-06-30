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

export function ThoughtOverlay({ thoughts, rangeLabel, onSelect }: ThoughtOverlayProps) {
  const initial = useMemo(() => createInitialParticles(thoughts, overlaySize), [thoughts]);
  const [particles, setParticles] = useState<FlameParticleType[]>(initial);

  useEffect(() => {
    setParticles(initial);
  }, [initial]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => {
      setParticles((current) => simulateParticles(current, overlaySize, 2));
    }, 96);
    return () => window.clearInterval(interval);
  }, []);

  const clusters = summarizeClusters(particles);

  return (
    <section data-testid="thought-overlay" className="pointer-events-none absolute inset-x-2 bottom-[7rem] top-[6.75rem] z-10">
      <div className="relative mx-auto h-full max-h-[420px] min-h-[300px] w-full max-w-[390px]" data-testid="thought-map">
        <RangeCircle label={rangeLabel} />
        {clusters.map((cluster) => (
          <div
            key={cluster.tagNormalized}
            data-testid="cluster-aura"
            className="anigeunde-aura absolute size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffdb68]/25"
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
            <button
              key={particle.id}
              type="button"
              data-testid="thought-character"
              className="anigeunde-character pointer-events-auto absolute grid w-24 -translate-x-1/2 -translate-y-1/2 justify-items-center gap-1 text-[9px] font-black text-[#252520] transition-[opacity] active:scale-[0.96]"
              style={{ left: `${(particle.x / overlaySize) * 100}%`, top: `${(particle.y / overlaySize) * 100}%` }}
              onClick={() => onSelect(thought)}
              aria-label={`${particle.tagLabel} 생각`}
            >
              <span className="max-w-[5.75rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white px-2 py-1 shadow-[2px_2px_0_rgba(35,35,31,0.78)]">
                {particle.tagLabel}
              </span>
              <span data-testid="flame-particle" className="contents">
                <span
                  data-testid="flame-glyph"
                  className="grid size-9 place-items-center rounded-[10px] bg-white text-xl shadow-[2px_2px_0_rgba(35,35,31,0.72)]"
                >
                  {CHARACTER_EMOJI[characterKey]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
