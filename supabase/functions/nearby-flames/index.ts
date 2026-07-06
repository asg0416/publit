import { getGridPrefixesForRange, sanitizeFlameForResponse, summarizeReactionRows, validateDeviceHash, validateThoughtRangeValue } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const rangeValue = validateThoughtRangeValue(body.rangeValue);
    const gridPrefixes = getGridPrefixesForRange(Number(body.lat), Number(body.lng), rangeValue);
    let deviceHash: string | null = null;
    try {
      deviceHash = typeof body.deviceHash === 'string' ? validateDeviceHash(body.deviceHash) : null;
    } catch {
      deviceHash = null;
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('flames')
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, expires_at, extension_count, character_key, character_emoji, region_label, region_code, display_scope, device_hash')
      .in('geohash', gridPrefixes)
      .eq('status', 'live')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) throw new PublitHttpError('NEARBY_FLAMES_FAILED', 500);
    const flameRows = data ?? [];
    const flameIds = flameRows.map((flame) => flame.id).filter(Boolean);
    const reactionRowsByFlame = new Map<string, Array<Record<string, unknown>>>();

    if (flameIds.length) {
      const { data: reactionRows, error: reactionError } = await supabase
        .from('flame_reactions')
        .select('flame_id, reaction_type, reaction_label, device_hash')
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
        ownedByDevice: Boolean(deviceHash && flame.device_hash === deviceHash),
        reactions: summarizeReactionRows(reactionRowsByFlame.get(String(flame.id)) ?? [], deviceHash),
      }))
      .filter((flame) => flame.lifecycle === 'live'));
  } catch (error) {
    return handleError(error);
  }
});
