import { validateDeviceHash, validateReportReason } from '../_shared/publit.ts';
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
    const reason = validateReportReason(body.reason);
    const detail = body.detail ? String(body.detail).slice(0, 240) : null;
    const supabase = createAdminClient();

    await assertActionAllowed(supabase, deviceHash, 'report_flame');

    const duplicate = await supabase
      .from('reports')
      .select('id')
      .eq('flame_id', flameId)
      .eq('device_hash', deviceHash)
      .eq('reason', reason)
      .maybeSingle();

    if (!duplicate.data) {
      const { error: insertError } = await supabase.from('reports').insert({
        flame_id: flameId,
        device_hash: deviceHash,
        reason,
        detail,
      });
      if (insertError) throw new PublitHttpError('REPORT_CREATE_FAILED', 500);
    }

    const { count, error: countError } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('flame_id', flameId);
    if (countError) throw new PublitHttpError('REPORT_REVIEW_FAILED', 500);

    const nextStatus = Number(count ?? 0) >= 5 ? 'hidden' : Number(count ?? 0) >= 3 ? 'reported' : null;
    if (nextStatus) {
      const { error: updateError } = await supabase
        .from('flames')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', flameId);
      if (updateError) throw new PublitHttpError('REPORT_STATUS_UPDATE_FAILED', 500);
    }

    await recordAction(supabase, deviceHash, 'report_flame');
    return json({ ok: true, status: nextStatus ?? 'reviewed' });
  } catch (error) {
    return handleError(error);
  }
});
