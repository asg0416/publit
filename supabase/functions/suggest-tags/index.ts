import { detectBlockedContent, encodeGrid, suggestTagsForText } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const text = String(body.text ?? '').slice(0, 80);
    const blocked = detectBlockedContent(text);
    if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);

    const supabase = createAdminClient();
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

    return json(suggestTagsForText(text, data ?? []));
  } catch (error) {
    return handleError(error);
  }
});
