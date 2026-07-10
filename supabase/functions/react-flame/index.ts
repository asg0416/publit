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
    const action = body.action === 'remove' ? 'remove' : 'add';
    const reactionLabel = reactionType === 'custom' ? validateCustomReactionLabel(body.reactionLabel) : null;
    if (reactionLabel) {
      const blocked = detectBlockedContent(reactionLabel);
      if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);
    }
    const supabase = createAdminClient();

    let duplicateQuery = supabase
      .from('flame_reactions')
      .select('id')
      .eq('flame_id', flameId)
      .eq('device_hash', deviceHash)
      .eq('reaction_type', reactionType);
    if (reactionLabel) duplicateQuery = duplicateQuery.eq('reaction_label', reactionLabel);
    const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
    if (duplicateError) throw new PublitHttpError('REACTION_LOOKUP_FAILED', 500);

    const { data: flame, error: flameError } = await supabase
      .from('flames')
      .select('id, heat_score, status, expires_at')
      .eq('id', flameId)
      .single();

    if (flameError || !flame || ['hidden', 'reported', 'expired', 'extinguished'].includes(flame.status)) {
      throw new PublitHttpError('FLAME_NOT_REACTABLE', 404);
    }
    if (flame.status !== 'live' || new Date(String(flame.expires_at)).getTime() <= Date.now()) {
      throw new PublitHttpError('FLAME_EXPIRED', 410);
    }

    const getReactions = async () => {
      const { data: reactionRows, error: reactionError } = await supabase
        .from('flame_reactions')
        .select('reaction_type, reaction_label, device_hash')
        .eq('flame_id', flameId);
      if (reactionError) throw new PublitHttpError('REACTION_SUMMARY_FAILED', 500);
      return summarizeReactionRows(reactionRows ?? [], deviceHash);
    };

    if (action === 'remove') {
      if (!duplicate) {
        return json({
          removed: false,
          heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)),
          reactions: await getReactions(),
        });
      }

      const { error: deleteError } = await supabase
        .from('flame_reactions')
        .delete()
        .eq('id', duplicate.id);
      if (deleteError) throw new PublitHttpError('REACTION_REMOVE_FAILED', 500);

      return json({
        removed: true,
        heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)),
        reactions: await getReactions(),
      });
    }

    if (duplicate) {
      return json({
        duplicate: true,
        heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)),
        reactions: await getReactions(),
      });
    }

    await assertActionAllowed(supabase, deviceHash, 'react_flame');

    const { error: insertError } = await supabase.from('flame_reactions').insert({
      flame_id: flameId,
      device_hash: deviceHash,
      reaction_type: reactionType,
      reaction_label: reactionLabel,
    });
    if (insertError?.code === '23505') {
      return json({
        duplicate: true,
        heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)),
        reactions: await getReactions(),
      });
    }
    if (insertError) throw new PublitHttpError('REACTION_CREATE_FAILED', 500);

    const { data: nextHeat, error: updateError } = await supabase
      .rpc('increment_flame_heat', { target_flame_id: flameId });
    if (updateError || !Number.isFinite(Number(nextHeat))) throw new PublitHttpError('FLAME_HEAT_UPDATE_FAILED', 500);

    await recordAction(supabase, deviceHash, 'react_flame');
    return json({ heatLabel: getHeatLabel(Number(nextHeat)), reactions: await getReactions() });
  } catch (error) {
    return handleError(error);
  }
});
