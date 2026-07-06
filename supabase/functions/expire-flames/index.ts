import { createAdminClient, handleError, json, PublitHttpError } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    if (req.method !== 'POST') throw new PublitHttpError('METHOD_NOT_ALLOWED', 405);

    const now = new Date().toISOString();
    const supabase = createAdminClient();

    const expired = await supabase
      .from('flames')
      .delete()
      .lte('expires_at', now);
    if (expired.error) throw new PublitHttpError('EXPIRED_DELETE_FAILED', 500);

    const legacy = await supabase
      .from('flames')
      .delete()
      .in('status', ['ember', 'trace', 'expired']);
    if (legacy.error) throw new PublitHttpError('LEGACY_EXPIRE_DELETE_FAILED', 500);

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
});
