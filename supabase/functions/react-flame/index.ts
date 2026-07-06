import { detectBlockedContent, getHeatLabel, summarizeReactionRows, validateCustomReactionLabel, validateDeviceHash, validateReactionType } from '../_shared/publit.ts';
import {
  assertActionAllowed,
  createAdminClient,
  handleError,
  json,
  PublitHttpError,
  readJson,
  recordAction,
} from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const flameId = String(body.flameId ?? '');
    if (!flameId) throw new PublitHttpError('INVALID_FLAME_ID', 400);

    const deviceHash = validateDeviceHash(body.deviceHash);
    const reactionType = validateReactionType(body.reactionType);
    const reactionLabel = reactionType === 'custom' ? validateCustomReactionLabel(body.reactionLabel) : null;
    if (reactionLabel) {
      const blocked = detectBlockedContent(reactionLabel);
      if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);
    }
    const supabase = createAdminClient();

    await assertActionAllowed(supabase, deviceHash, 'react_flame');

    let duplicateQuery = supabase
      .from('flame_reactions')
      .select('id')
      .eq('flame_id', flameId)
      .eq('device_hash', deviceHash)
      .eq('reaction_type', reactionType);
    if (reactionLabel) duplicateQuery = duplicateQuery.eq('reaction_label', reactionLabel);
    const duplicate = await duplicateQuery.maybeSingle();

    const { data: flame, error: flameError } = await supabase
      .from('flames')
      .select('id, heat_score, status')
      .eq('id', flameId)
      .single();

    if (flameError || !flame || ['hidden', 'reported', 'expired', 'extinguished'].includes(flame.status)) {
      throw new PublitHttpError('FLAME_NOT_REACTABLE', 404);
    }

    const getReactions = async () => {
      const { data: reactionRows, error: reactionError } = await supabase
        .from('flame_reactions')
        .select('reaction_type, reaction_label, device_hash')
        .eq('flame_id', flameId);
      if (reactionError) throw new PublitHttpError('REACTION_SUMMARY_FAILED', 500);
      return summarizeReactionRows(reactionRows ?? [], deviceHash);
    };

    if (duplicate.data) {
      return json({
        duplicate: true,
        heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)),
        reactions: await getReactions(),
      });
    }

    const { error: insertError } = await supabase.from('flame_reactions').insert({
      flame_id: flameId,
      device_hash: deviceHash,
      reaction_type: reactionType,
      reaction_label: reactionLabel,
    });
    if (insertError) throw new PublitHttpError('REACTION_CREATE_FAILED', 500);

    const nextHeat = Number(flame.heat_score ?? 0) + 1;
    const { error: updateError } = await supabase
      .from('flames')
      .update({ heat_score: nextHeat, updated_at: new Date().toISOString() })
      .eq('id', flameId);
    if (updateError) throw new PublitHttpError('FLAME_HEAT_UPDATE_FAILED', 500);

    await recordAction(supabase, deviceHash, 'react_flame');
    return json({ heatLabel: getHeatLabel(nextHeat), reactions: await getReactions() });
  } catch (error) {
    return handleError(error);
  }
});
