import { selectActiveSlotState, validateDeviceHash } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const deviceHash = validateDeviceHash(body.deviceHash);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('flames')
      .select('id, tag_label, status, created_at')
      .eq('device_hash', deviceHash)
      .eq('status', 'live')
      .gt('live_until', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new PublitHttpError('MY_FLAMES_FAILED', 500);

    return json(selectActiveSlotState(data ?? []));
  } catch (error) {
    return handleError(error);
  }
});
