import { validateDeviceHash } from '../_shared/publit.ts';
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
    const supabase = createAdminClient();

    await assertActionAllowed(supabase, deviceHash, 'extinguish_flame');

    const { data, error } = await supabase
      .from('flames')
      .update({ status: 'extinguished', updated_at: new Date().toISOString() })
      .eq('id', flameId)
      .eq('device_hash', deviceHash)
      .eq('status', 'live')
      .select('id')
      .maybeSingle();

    if (error || !data) throw new PublitHttpError('FLAME_NOT_EXTINGUISHABLE', 404);

    await recordAction(supabase, deviceHash, 'extinguish_flame');
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
});
