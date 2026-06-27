import { heatLevelFromLabel } from './heatLabel.ts';
import type { ClusterSummary, Flame, FlameParticle } from './types.ts';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampToCircle(particle: FlameParticle, size: number): FlameParticle {
  const center = size / 2;
  const radius = size / 2;
  const dx = particle.x - center;
  const dy = particle.y - center;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return particle;

  const scale = (radius - 2) / distance;
  return {
    ...particle,
    x: center + dx * scale,
    y: center + dy * scale,
    vx: particle.vx * -0.35,
    vy: particle.vy * -0.35,
  };
}

export function createInitialParticles(flames: readonly Flame[], size: number): FlameParticle[] {
  const center = size / 2;
  const radius = size * 0.38;

  return flames.map((flame) => {
    const seed = hashString(`${flame.id}:${flame.tagNormalized}`);
    const angle = ((seed % 360) * Math.PI) / 180;
    const spread = 0.25 + ((seed >>> 8) % 100) / 160;
    return {
      id: `particle-${flame.id}`,
      flameId: flame.id,
      tagNormalized: flame.tagNormalized,
      tagLabel: flame.tagLabel,
      category: flame.category,
      x: center + Math.cos(angle) * radius * spread,
      y: center + Math.sin(angle) * radius * spread,
      vx: (((seed >>> 16) % 100) - 50) / 700,
      vy: (((seed >>> 24) % 100) - 50) / 700,
      selfStrength: flame.selfStrength,
      heatLevel: heatLevelFromLabel(flame.heatLabel),
      lifecycle: flame.lifecycle,
    };
  });
}

export function simulateParticles(particles: readonly FlameParticle[], size: number, steps = 1): FlameParticle[] {
  let current = particles.map((particle) => ({ ...particle }));
  const center = size / 2;

  for (let step = 0; step < steps; step += 1) {
    const tagCenters = new Map<string, { x: number; y: number; count: number }>();
    const categoryCenters = new Map<string, { x: number; y: number; count: number }>();

    for (const particle of current) {
      const tag = tagCenters.get(particle.tagNormalized) ?? { x: 0, y: 0, count: 0 };
      tag.x += particle.x;
      tag.y += particle.y;
      tag.count += 1;
      tagCenters.set(particle.tagNormalized, tag);

      const category = categoryCenters.get(particle.category) ?? { x: 0, y: 0, count: 0 };
      category.x += particle.x;
      category.y += particle.y;
      category.count += 1;
      categoryCenters.set(particle.category, category);
    }

    current = current.map((particle, index) => {
      let vx = particle.vx + Math.sin(step + index) * 0.004;
      let vy = particle.vy + Math.cos(step + index * 1.7) * 0.004;
      const tag = tagCenters.get(particle.tagNormalized);
      const category = categoryCenters.get(particle.category);

      if (tag && tag.count > 1) {
        vx += ((tag.x / tag.count - particle.x) / size) * 0.035;
        vy += ((tag.y / tag.count - particle.y) / size) * 0.035;
      }
      if (category && category.count > 1) {
        vx += ((category.x / category.count - particle.x) / size) * 0.012;
        vy += ((category.y / category.count - particle.y) / size) * 0.012;
      }

      for (const other of current) {
        if (other.id === particle.id) continue;
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance < 28) {
          vx += (dx / distance) * 0.018;
          vy += (dy / distance) * 0.018;
        }
      }

      const driftToCenterX = ((center - particle.x) / size) * 0.004;
      const driftToCenterY = ((center - particle.y) / size) * 0.004;
      vx = (vx + driftToCenterX) * 0.96;
      vy = (vy + driftToCenterY) * 0.96;

      return clampToCircle({ ...particle, vx, vy, x: particle.x + vx, y: particle.y + vy }, size);
    });
  }

  return current;
}

export function summarizeClusters(particles: readonly FlameParticle[]): ClusterSummary[] {
  const groups = new Map<string, ClusterSummary>();
  for (const particle of particles) {
    const current = groups.get(particle.tagNormalized) ?? {
      tagNormalized: particle.tagNormalized,
      tagLabel: particle.tagLabel,
      count: 0,
      x: 0,
      y: 0,
    };
    current.count += 1;
    current.x += particle.x;
    current.y += particle.y;
    groups.set(particle.tagNormalized, current);
  }

  return Array.from(groups.values())
    .filter((cluster) => cluster.count >= 3)
    .map((cluster) => ({ ...cluster, x: cluster.x / cluster.count, y: cluster.y / cluster.count }));
}
