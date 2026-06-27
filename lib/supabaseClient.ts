import type { Flame, HotTopic, ReactionType, ReportReason, TagSuggestion } from './flame/types.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertPublicEnv() {
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

async function invoke<T>(slug: string, body: Record<string, unknown>): Promise<T> {
  assertPublicEnv();
  const response = await fetch(`${url}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      apikey: key!,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.code ?? `${slug.toUpperCase()}_FAILED`);
  }
  return payload as T;
}

export const publitApi = {
  getHotTopics: (body: { lat?: number; lng?: number; scope?: 'local' | 'global' | 'regional' }) =>
    invoke<HotTopic[]>('get-hot-topics', body),
  suggestTags: (body: { text: string; lat?: number; lng?: number }) =>
    invoke<TagSuggestion[]>('suggest-tags', body),
  nearbyFlames: (body: { lat: number; lng: number }) =>
    invoke<Flame[]>('nearby-flames', body),
  myFlames: (body: { deviceHash: string }) =>
    invoke<{ used: number; limit: number; isFull: boolean; activeFlames: Array<{ id: string; tagLabel: string; status: string; createdAt: string }> }>('my-flames', body),
  createFlame: (body: {
    text: string;
    tagLabel: string;
    category: string;
    mood: string;
    selfStrength: number;
    lat: number;
    lng: number;
    deviceHash: string;
  }) => invoke<{ flame?: Flame; activeFlames?: Array<{ id: string; tagLabel: string; status: string; createdAt: string }>; error?: { code: string } }>('create-flame', body),
  reactFlame: (body: { flameId: string; reactionType: ReactionType; deviceHash: string }) =>
    invoke<{ heatLabel: string; duplicate?: boolean }>('react-flame', body),
  reportFlame: (body: { flameId: string; reason: ReportReason; detail?: string; deviceHash: string }) =>
    invoke<{ ok: boolean; status: string }>('report-flame', body),
  extinguishFlame: (body: { flameId: string; deviceHash: string }) =>
    invoke<{ ok: boolean }>('extinguish-flame', body),
};
