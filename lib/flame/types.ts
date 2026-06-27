export type FlameCategory = 'politics' | 'local' | 'society' | 'safety' | 'daily' | 'other';
export type FlameMood = 'quiet' | 'curious' | 'serious' | 'want_talk';
export type FlameLifecycle = 'live' | 'ember' | 'trace';
export type HeatLevel = 'fresh' | 'warming' | 'hot' | 'cluster';
export type ReactionType = 'similar' | 'curious' | 'need_source' | 'watching';
export type ReportReason = 'misinformation' | 'doxxing' | 'violence' | 'illegal' | 'hate' | 'spam' | 'privacy' | 'other';

export type Flame = {
  id: string;
  text?: string;
  tagLabel: string;
  tagNormalized: string;
  category: FlameCategory;
  mood: FlameMood;
  selfStrength: 1 | 2 | 3;
  heatLabel: string;
  lifecycle: FlameLifecycle;
  createdAt: string;
  liveUntil?: string;
  emberUntil?: string;
};

export type HotTopic = {
  displayLabel: string;
  normalizedKey: string;
  category: FlameCategory;
  scope: 'local' | 'regional' | 'global';
  heatLabel: string;
};

export type TagSuggestion = {
  displayLabel: string;
  normalizedKey: string;
  category: FlameCategory;
  source: string;
};

export type FlameParticle = {
  id: string;
  flameId: string;
  tagNormalized: string;
  tagLabel: string;
  category: FlameCategory;
  x: number;
  y: number;
  vx: number;
  vy: number;
  selfStrength: 1 | 2 | 3;
  heatLevel: HeatLevel;
  lifecycle: FlameLifecycle;
};

export type ClusterSummary = {
  tagNormalized: string;
  tagLabel: string;
  count: number;
  x: number;
  y: number;
};
