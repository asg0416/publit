import { encodeGrid, sanitizeFlameForResponse } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const geohash = encodeGrid(Number(body.lat), Number(body.lng));
    const prefix = geohash.slice(0, 5);
    const now = new Date();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('flames')
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, character_key, region_label, region_code, display_scope')
      .like('geohash', `${prefix}%`)
      .in('status', ['live', 'ember', 'trace'])
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) throw new PublitHttpError('NEARBY_FLAMES_FAILED', 500);

    return json((data ?? [])
      .map((flame) => sanitizeFlameForResponse(flame, now))
      .filter((flame) => flame.lifecycle !== 'expired'));
  } catch (error) {
    return handleError(error);
  }
});
