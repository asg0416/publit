import {
  detectBlockedContent,
  deriveCharacterKey,
  encodeGrid,
  normalizeTag,
  sanitizeCharacterEmoji,
  sanitizeFlameForResponse,
  selectActiveSlotState,
  validateCategory,
  validateDeviceHash,
  validateDisplayScope,
  validateMood,
  validateStrength,
} from '../_shared/publit.ts';
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
    const text = String(body.text ?? '').trim();
    if (!text || text.length > 80) throw new PublitHttpError('INVALID_TEXT', 400);

    const tag = normalizeTag(String(body.tagLabel ?? ''));
    if (tag.label.length > 20) throw new PublitHttpError('INVALID_TAG', 400);

    const blocked = detectBlockedContent(`${text} ${tag.label}`);
    if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);

    const deviceHash = validateDeviceHash(body.deviceHash);
    const mood = validateMood(body.mood);
    const selfStrength = validateStrength(body.selfStrength);
    const category = validateCategory(body.category, text, tag.normalized);
    const characterKey = deriveCharacterKey(body.characterKey ?? `${deviceHash}:${tag.normalized}`);
    const characterEmoji = sanitizeCharacterEmoji(body.characterEmoji);
    const displayScope = validateDisplayScope(body.displayScope);
    const regionCode = typeof body.regionCode === 'string' ? body.regionCode.slice(0, 40) : null;
    const positionLatitude = Number(body.lat);
    const positionLongitude = Number(body.lng);
    const geohash = encodeGrid(positionLatitude, positionLongitude);
    const now = new Date();
    const liveUntil = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const emberUntil = new Date(liveUntil.getTime() + 24 * 60 * 60 * 1000);
    const traceUntil = new Date(emberUntil.getTime() + 7 * 24 * 60 * 60 * 1000);
    const supabase = createAdminClient();

    await assertActionAllowed(supabase, deviceHash, 'create_flame', now);

    const { data: activeRows, error: activeError } = await supabase
      .from('flames')
      .select('id, tag_label, status, created_at')
      .eq('device_hash', deviceHash)
      .eq('status', 'live')
      .gt('live_until', now.toISOString())
      .order('created_at', { ascending: false });

    if (activeError) throw new PublitHttpError('ACTIVE_SLOT_LOOKUP_FAILED', 500);

    const slotState = selectActiveSlotState(activeRows ?? []);
    if (slotState.isFull) {
      return json({
        error: { code: 'FLAME_SLOT_FULL', message: 'FLAME_SLOT_FULL' },
        activeFlames: slotState.activeFlames,
      }, 409);
    }

    const flameInsert = {
      text,
      tag_label: tag.label,
      tag_normalized: tag.normalized,
      category,
      mood,
      self_strength: selfStrength,
      geohash,
      character_key: characterKey,
      character_emoji: characterEmoji,
      display_scope: displayScope,
      region_code: regionCode,
      device_hash: deviceHash,
      status: 'live',
      live_until: liveUntil.toISOString(),
      ember_until: emberUntil.toISOString(),
      trace_until: traceUntil.toISOString(),
    };

    const { data: flame, error } = await supabase
      .from('flames')
      .insert(flameInsert)
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, character_key, character_emoji, region_label, region_code, display_scope')
      .single();

    if (error) throw new PublitHttpError('FLAME_CREATE_FAILED', 500);

    await supabase.from('topics').upsert({
      raw_keyword: tag.normalized,
      display_label: tag.label,
      normalized_key: tag.normalized,
      category,
      scope: 'global',
      heat_score: 1,
      status: 'visible',
    }, { onConflict: 'scope,normalized_key' });
    await recordAction(supabase, deviceHash, 'create_flame');

    return json({ flame: sanitizeFlameForResponse(flame, now) }, 201);
  } catch (error) {
    return handleError(error);
  }
});
