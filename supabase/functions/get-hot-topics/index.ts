import { encodeGrid, getGridPrefixesForRange, getHeatLabel } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const requestedScope = String(body.scope ?? 'global');
    const scope = requestedScope === 'local' || requestedScope === 'regional' ? requestedScope : 'global';
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    let flameQuery = supabase
      .from('flames')
      .select('tag_label, tag_normalized, category, heat_score, created_at, geohash, extension_count')
      .eq('status', 'live')
      .gt('expires_at', now)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    if (scope === 'local' && body.lat !== undefined && body.lng !== undefined) {
      flameQuery = flameQuery.in('geohash', getGridPrefixesForRange(Number(body.lat), Number(body.lng), '3km'));
    }

    const { data: flameRows, error: flameError } = await flameQuery;
    if (flameError) throw new PublitHttpError('HOT_TOPICS_FAILED', 500);

    const grouped = new Map<string, {
      displayLabel: string;
      normalizedKey: string;
      category: string;
      heatScore: number;
      createdAt: string;
    }>();

    for (const flame of flameRows ?? []) {
      const normalizedKey = String(flame.tag_normalized ?? '');
      if (!normalizedKey) continue;
      const previous = grouped.get(normalizedKey);
      const score = 5 + Number(flame.heat_score ?? 0) + Number(flame.extension_count ?? 0) * 2;
      grouped.set(normalizedKey, {
        displayLabel: String(flame.tag_label ?? `#${normalizedKey}`),
        normalizedKey,
        category: String(flame.category ?? previous?.category ?? 'other'),
        heatScore: (previous?.heatScore ?? 0) + score,
        createdAt: String(flame.created_at ?? previous?.createdAt ?? ''),
      });
    }

    const realTopics = Array.from(grouped.values())
      .sort((a, b) => b.heatScore - a.heatScore || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((topic) => ({
        displayLabel: topic.displayLabel,
        normalizedKey: topic.normalizedKey,
        category: topic.category,
        scope,
        heatLabel: getHeatLabel(topic.heatScore),
      }));

    if (realTopics.length) return json(realTopics);

    let query = supabase
      .from('topics')
      .select('display_label, normalized_key, category, scope, heat_score')
      .eq('status', 'visible')
      .eq('scope', scope)
      .order('heat_score', { ascending: false })
      .limit(10);

    if (scope === 'local' && body.lat !== undefined && body.lng !== undefined) {
      query = query.like('geohash', `${encodeGrid(Number(body.lat), Number(body.lng)).slice(0, 5)}%`);
    }

    const { data, error } = await query;
    if (error) throw new PublitHttpError('HOT_TOPICS_FAILED', 500);

    return json((data ?? []).map((topic) => ({
      displayLabel: topic.display_label,
      normalizedKey: topic.normalized_key,
      category: topic.category,
      scope: topic.scope,
      heatLabel: getHeatLabel(Number(topic.heat_score ?? 0)),
    })));
  } catch (error) {
    return handleError(error);
  }
});
