import { detectBlockedContent, encodeGrid, getGridPrefixesForRange, suggestTagsForText } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const text = String(body.text ?? '').slice(0, 80);
    const blocked = detectBlockedContent(text);
    if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);

    const supabase = createAdminClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    let flameQuery = supabase
      .from('flames')
      .select('tag_label, tag_normalized, category, heat_score, created_at, geohash')
      .eq('status', 'live')
      .gt('expires_at', now)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (body.lat !== undefined && body.lng !== undefined) {
      const gridPrefixes = getGridPrefixesForRange(Number(body.lat), Number(body.lng), '10km');
      flameQuery = flameQuery.or(gridPrefixes.map((prefix) => `geohash.like.${prefix}%`).join(','));
    }

    const { data: flameRows, error: flameError } = await flameQuery;
    if (flameError) throw new PublitHttpError('TAG_SUGGESTION_FAILED', 500);

    const flameTopics = (flameRows ?? []).map((flame) => ({
      display_label: flame.tag_label,
      normalized_key: flame.tag_normalized,
      category: flame.category,
      scope: 'recent',
      heat_score: flame.heat_score,
      status: 'visible',
    }));

    let query = supabase
      .from('topics')
      .select('display_label, normalized_key, category, scope, heat_score, status')
      .eq('status', 'visible')
      .order('heat_score', { ascending: false })
      .limit(10);

    if (body.lat !== undefined && body.lng !== undefined) {
      query = query.or(`scope.eq.global,geohash.like.${encodeGrid(Number(body.lat), Number(body.lng)).slice(0, 5)}%`);
    }

    const { data, error } = await query;
    if (error) throw new PublitHttpError('TAG_SUGGESTION_FAILED', 500);

    return json(suggestTagsForText(text, [...flameTopics, ...(data ?? [])]));
  } catch (error) {
    return handleError(error);
  }
});
