import { sanitizeCommentForResponse } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const flameId = String(body.flameId ?? '');
    if (!flameId) throw new PublitHttpError('INVALID_FLAME_ID', 400);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('flame_comments')
      .select('id, body, created_at')
      .eq('flame_id', flameId)
      .eq('status', 'visible')
      .order('created_at', { ascending: true })
      .limit(80);
    if (error) throw new PublitHttpError('COMMENTS_LOOKUP_FAILED', 500);

    return json((data ?? []).map((row) => sanitizeCommentForResponse(row)));
  } catch (error) {
    return handleError(error);
  }
});
