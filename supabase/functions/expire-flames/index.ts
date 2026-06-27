import { createAdminClient, handleError, json, PublitHttpError } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    if (req.method !== 'POST') throw new PublitHttpError('METHOD_NOT_ALLOWED', 405);

    const now = new Date().toISOString();
    const supabase = createAdminClient();

    const live = await supabase
      .from('flames')
      .update({ status: 'ember', updated_at: now })
      .eq('status', 'live')
      .lte('live_until', now);
    if (live.error) throw new PublitHttpError('LIVE_EXPIRE_FAILED', 500);

    const ember = await supabase
      .from('flames')
      .update({ status: 'trace', updated_at: now })
      .eq('status', 'ember')
      .lte('ember_until', now);
    if (ember.error) throw new PublitHttpError('EMBER_EXPIRE_FAILED', 500);

    const trace = await supabase
      .from('flames')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'trace')
      .lte('trace_until', now);
    if (trace.error) throw new PublitHttpError('TRACE_EXPIRE_FAILED', 500);

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
});
