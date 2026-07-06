import { sanitizeFlameForResponse, validateDeviceHash } from '../_shared/publit.ts';
import {
  assertActionAllowed,
  createAdminClient,
  handleError,
  json,
  PublitHttpError,
  readJson,
  recordAction,
} from '../_shared/supabase.ts';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const flameId = String(body.flameId ?? '');
    if (!flameId) throw new PublitHttpError('INVALID_FLAME_ID', 400);

    const deviceHash = validateDeviceHash(body.deviceHash);
    const supabase = createAdminClient();
    await assertActionAllowed(supabase, deviceHash, 'extend_flame');

    const { data: flame, error: flameError } = await supabase
      .from('flames')
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, expires_at, extension_count, character_key, character_emoji, region_label, region_code, display_scope, device_hash')
      .eq('id', flameId)
      .single();
    if (flameError || !flame) throw new PublitHttpError('FLAME_NOT_FOUND', 404);
    if (flame.device_hash !== deviceHash) throw new PublitHttpError('FLAME_NOT_OWNED', 403);
    if (flame.status !== 'live') {
      throw new PublitHttpError('FLAME_NOT_EXTENDABLE', 409);
    }

    const now = new Date();
    const currentExpiresAt = new Date(String(flame.expires_at ?? flame.live_until));
    if (!Number.isFinite(currentExpiresAt.getTime()) || currentExpiresAt.getTime() <= now.getTime()) {
      throw new PublitHttpError('FLAME_EXPIRED', 410);
    }

    const baseTime = Math.max(now.getTime(), currentExpiresAt.getTime());
    const liveUntil = new Date(baseTime + ONE_DAY_MS);
    const emberUntil = new Date(liveUntil.getTime() + ONE_HOUR_MS);
    const traceUntil = new Date(emberUntil.getTime() + ONE_HOUR_MS);
    const extensionCount = Number(flame.extension_count ?? 0) + 1;

    const { data: updated, error: updateError } = await supabase
      .from('flames')
      .update({
        status: 'live',
        live_until: liveUntil.toISOString(),
        ember_until: emberUntil.toISOString(),
        trace_until: traceUntil.toISOString(),
        expires_at: liveUntil.toISOString(),
        extension_count: extensionCount,
        updated_at: now.toISOString(),
      })
      .eq('id', flameId)
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, expires_at, extension_count, character_key, character_emoji, region_label, region_code, display_scope')
      .single();
    if (updateError || !updated) throw new PublitHttpError('FLAME_EXTEND_FAILED', 500);

    await recordAction(supabase, deviceHash, 'extend_flame');
    return json({ flame: sanitizeFlameForResponse(updated, now) });
  } catch (error) {
    return handleError(error);
  }
});
