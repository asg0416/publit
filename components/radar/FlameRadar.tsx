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
    }, 96);
    return () => window.clearInterval(interval);
  }, []);

  const clusters = summarizeClusters(particles);
  const clusteredTags = new Set(clusters.map((cluster) => cluster.tagNormalized));

  return (
    <section
      className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-full border border-white/12 bg-[radial-gradient(circle,rgba(245,78,0,0.2)_0,rgba(192,168,221,0.12)_42%,rgba(159,187,224,0.1)_70%,rgba(247,247,244,0.05)_100%)]"
      data-testid="flame-radar"
      aria-label="불꽃 레이더"
    >
      <div className="absolute inset-0 publit-radar-sweep opacity-70" data-testid="radar-sweep" />
      <div className="absolute inset-6 rounded-full border border-white/10" />
      <div className="absolute inset-16 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/8" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/8" />
      <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9fbbe0] shadow-[0_0_18px_rgba(159,187,224,0.72)]" aria-label="나" />
      {clusters.map((cluster) => <ClusterAura key={cluster.tagNormalized} cluster={cluster} />)}
      {particles.map((particle) => {
        const flame = flames.find((item) => item.id === particle.flameId);
        return (
          <FlameParticle
            key={particle.id}
            particle={particle}
            showLabel={!clusteredTags.has(particle.tagNormalized)}
            onClick={() => flame && onSelect(flame)}
          />
        );
      })}
    </section>
  );
}
