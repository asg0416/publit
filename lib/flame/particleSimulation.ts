import { heatLevelFromLabel } from './heatLabel.ts';
import type { ClusterSummary, Flame, FlameParticle } from './types.ts';

const PARTICLE_BOUNDARY_PADDING = 54;
const MIN_CLICK_DISTANCE = 40;

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
  const radius = size / 2 - PARTICLE_BOUNDARY_PADDING;
  const dx = particle.x - center;
  const dy = particle.y - center;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return particle;

  const scale = (radius - 2) / distance;
  return {
    ...particle,
    x: center + dx * scale,
    y: center + dy * scale,
    vx: particle.vx * -0.28,
    vy: particle.vy * -0.28,
  };
}

function anchorForTag(tagNormalized: string, size: number) {
  const center = size / 2;
  const seed = hashString(tagNormalized || 'other');
  const angle = ((seed % 360) * Math.PI) / 180;
  const radius = size * (0.1 + ((seed >>> 8) % 100) / 900);
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function separateParticles(particles: FlameParticle[], size: number): FlameParticle[] {
  let next = particles.map((particle) => ({ ...particle }));

  for (let pass = 0; pass < 6; pass += 1) {
    for (let index = 0; index < next.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < next.length; otherIndex += 1) {
        const particle = next[index];
        const other = next[otherIndex];
        let dx = particle.x - other.x;
        let dy = particle.y - other.y;
        let distance = Math.hypot(dx, dy);

        if (distance === 0) {
          const seed = hashString(`${particle.id}:${other.id}`);
          const angle = ((seed % 360) * Math.PI) / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        if (distance >= MIN_CLICK_DISTANCE) continue;

        const push = (MIN_CLICK_DISTANCE - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;

        next[index] = {
          ...particle,
          x: particle.x + nx * push,
          y: particle.y + ny * push,
          vx: particle.vx + nx * 0.01,
          vy: particle.vy + ny * 0.01,
        };
        next[otherIndex] = {
          ...other,
          x: other.x - nx * push,
          y: other.y - ny * push,
          vx: other.vx - nx * 0.01,
          vy: other.vy - ny * 0.01,
        };
      }
    }

    next = next.map((particle) => clampToCircle(particle, size));
  }

  return next;
}

export function createInitialParticles(flames: readonly Flame[], size: number): FlameParticle[] {
  const tagCounts = new Map<string, number>();

  return flames.map((flame) => {
    const tagIndex = tagCounts.get(flame.tagNormalized) ?? 0;
    tagCounts.set(flame.tagNormalized, tagIndex + 1);

    const seed = hashString(`${flame.id}:${flame.tagNormalized}`);
    const anchor = anchorForTag(flame.tagNormalized, size);
    const angle = ((seed % 360) * Math.PI) / 180 + tagIndex * 1.92;
    const orbit = 8 + (tagIndex % 4) * 5 + ((seed >>> 10) % 6);

    return {
      id: `particle-${flame.id}`,
      flameId: flame.id,
      tagNormalized: flame.tagNormalized,
      tagLabel: flame.tagLabel,
      category: flame.category,
      x: anchor.x + Math.cos(angle) * orbit,
      y: anchor.y + Math.sin(angle) * orbit,
      vx: (((seed >>> 16) % 100) - 50) / 900,
      vy: (((seed >>> 24) % 100) - 50) / 900,
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
      const seed = hashString(`${particle.id}:${particle.tagNormalized}`);
      const tagSeed = hashString(particle.tagNormalized || 'other');
      let vx = particle.vx + Math.sin(step * 0.21 + index + seed * 0.00001) * 0.0035;
      let vy = particle.vy + Math.cos(step * 0.19 + index * 1.7 + seed * 0.00002) * 0.0035;
      const tag = tagCenters.get(particle.tagNormalized);
      const category = categoryCenters.get(particle.category);

      if (tag && tag.count > 1) {
        const tagX = tag.x / tag.count;
        const tagY = tag.y / tag.count;
        vx += ((tagX - particle.x) / size) * 0.1;
        vy += ((tagY - particle.y) / size) * 0.1;
        vx += Math.sin(step * 0.045 + tagSeed * 0.00008) * 0.01;
        vy += Math.cos(step * 0.04 + tagSeed * 0.00011) * 0.01;
      }

      if (category && category.count > 1) {
        vx += ((category.x / category.count - particle.x) / size) * 0.007;
        vy += ((category.y / category.count - particle.y) / size) * 0.007;
      }

      for (const other of current) {
        if (other.id === particle.id || other.tagNormalized === particle.tagNormalized) continue;
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance < 36) {
          vx += (dx / distance) * 0.017;
          vy += (dy / distance) * 0.017;
        }
      }

      const driftToCenterX = ((center - particle.x) / size) * 0.003;
      const driftToCenterY = ((center - particle.y) / size) * 0.003;
      vx = (vx + driftToCenterX) * 0.965;
      vy = (vy + driftToCenterY) * 0.965;

      return clampToCircle({ ...particle, vx, vy, x: particle.x + vx, y: particle.y + vy }, size);
    });

    current = separateParticles(current, size);
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
