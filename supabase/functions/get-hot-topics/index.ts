import { encodeGrid, getHeatLabel } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const requestedScope = String(body.scope ?? 'global');
    const scope = requestedScope === 'local' || requestedScope === 'regional' ? requestedScope : 'global';
    const supabase = createAdminClient();
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
