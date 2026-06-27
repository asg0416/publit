'use client';

import { useEffect, useMemo, useState } from 'react';
import { createInitialParticles, simulateParticles, summarizeClusters } from '@/lib/flame/particleSimulation';
import type { Flame, FlameParticle as FlameParticleType } from '@/lib/flame/types';
import { ClusterAura } from './ClusterAura';
import { FlameParticle } from './FlameParticle';

type FlameRadarProps = {
  flames: Flame[];
  onSelect: (flame: Flame) => void;
};

const size = 320;

export function FlameRadar({ flames, onSelect }: FlameRadarProps) {
  const initial = useMemo(() => createInitialParticles(flames, size), [flames]);
  const [particles, setParticles] = useState<FlameParticleType[]>(initial);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setParticles(initial);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initial]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => {
      setParticles((current) => simulateParticles(current, size, 2));
    }, 120);
    return () => window.clearInterval(interval);
  }, []);

  const clusters = summarizeClusters(particles);

  return (
    <section
      className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-full bg-[radial-gradient(circle,rgba(76,201,240,0.16)_0,rgba(76,201,240,0.05)_42%,rgba(255,154,61,0.08)_72%,rgba(255,255,255,0.04)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_30px_80px_rgba(0,0,0,0.38)]"
      data-testid="flame-radar"
      aria-label="불꽃 레이더"
    >
      <div className="absolute inset-6 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
      <div className="absolute inset-16 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" />
      <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8ee7ff] shadow-[0_0_18px_rgba(142,231,255,0.7)]" aria-label="나" />
      {clusters.map((cluster) => <ClusterAura key={cluster.tagNormalized} cluster={cluster} />)}
      {particles.map((particle) => {
        const flame = flames.find((item) => item.id === particle.flameId);
        return (
          <FlameParticle
            key={particle.id}
            particle={particle}
            onClick={() => flame && onSelect(flame)}
          />
        );
      })}
    </section>
  );
}
