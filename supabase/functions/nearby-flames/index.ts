import { encodeGrid, sanitizeFlameForResponse, summarizeReactionRows, validateDeviceHash } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const geohash = encodeGrid(Number(body.lat), Number(body.lng));
    let deviceHash: string | null = null;
    try {
      deviceHash = typeof body.deviceHash === 'string' ? validateDeviceHash(body.deviceHash) : null;
    } catch {
      deviceHash = null;
    }
    const prefix = geohash;
    const now = new Date();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('flames')
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, character_key, character_emoji, region_label, region_code, display_scope')
      .like('geohash', `${prefix}%`)
      .in('status', ['live', 'ember', 'trace'])
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) throw new PublitHttpError('NEARBY_FLAMES_FAILED', 500);
    const flameRows = data ?? [];
    const flameIds = flameRows.map((flame) => flame.id).filter(Boolean);
    const reactionRowsByFlame = new Map<string, Array<Record<string, unknown>>>();

    if (flameIds.length) {
      const { data: reactionRows, error: reactionError } = await supabase
        .from('flame_reactions')
        .select('flame_id, reaction_type, device_hash')
        .in('flame_id', flameIds);
      if (reactionError) throw new PublitHttpError('REACTION_SUMMARY_FAILED', 500);

      for (const reactionRow of reactionRows ?? []) {
        const flameId = String(reactionRow.flame_id ?? '');
        if (!flameId) continue;
        const rows = reactionRowsByFlame.get(flameId) ?? [];
        rows.push(reactionRow);
        reactionRowsByFlame.set(flameId, rows);
      }
    }

    return json(flameRows
      .map((flame) => ({
        ...sanitizeFlameForResponse(flame, now),
        reactions: summarizeReactionRows(reactionRowsByFlame.get(String(flame.id)) ?? [], deviceHash),
      }))
      .filter((flame) => flame.lifecycle !== 'expired'));
  } catch (error) {
    return handleError(error);
  }
});
