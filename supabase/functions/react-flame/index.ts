import { getHeatLabel, validateDeviceHash, validateReactionType } from '../_shared/publit.ts';
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
    const supabase = createAdminClient();

    await assertActionAllowed(supabase, deviceHash, 'react_flame');

    const duplicate = await supabase
      .from('flame_reactions')
      .select('id')
      .eq('flame_id', flameId)
      .eq('device_hash', deviceHash)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    const { data: flame, error: flameError } = await supabase
      .from('flames')
      .select('id, heat_score, status')
      .eq('id', flameId)
      .single();

    if (flameError || !flame || ['hidden', 'reported', 'expired', 'extinguished'].includes(flame.status)) {
      throw new PublitHttpError('FLAME_NOT_REACTABLE', 404);
    }

    if (duplicate.data) {
      return json({ duplicate: true, heatLabel: getHeatLabel(Number(flame.heat_score ?? 0)) });
    }

    const { error: insertError } = await supabase.from('flame_reactions').insert({
      flame_id: flameId,
      device_hash: deviceHash,
      reaction_type: reactionType,
    });
    if (insertError) throw new PublitHttpError('REACTION_CREATE_FAILED', 500);

    const nextHeat = Number(flame.heat_score ?? 0) + 1;
    const { error: updateError } = await supabase
      .from('flames')
      .update({ heat_score: nextHeat, updated_at: new Date().toISOString() })
      .eq('id', flameId);
    if (updateError) throw new PublitHttpError('FLAME_HEAT_UPDATE_FAILED', 500);

    await recordAction(supabase, deviceHash, 'react_flame');
    return json({ heatLabel: getHeatLabel(nextHeat) });
  } catch (error) {
    return handleError(error);
  }
});
