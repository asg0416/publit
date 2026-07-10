import { getGridCellRadiusMeters, getGridPrefixesForRange, getGridRelativePosition, getThoughtRangeMeters, normalizeContentLocale, sanitizeFlameForResponse, summarizeReactionRows, validateDeviceHash, validateThoughtRangeValue } from '../_shared/publit.ts';
import { createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await readJson(req);
    const rangeValue = validateThoughtRangeValue(body.rangeValue);
    const latitude = Number(body.lat);
    const longitude = Number(body.lng);
    const radiusMeters = getThoughtRangeMeters(rangeValue);
    const gridPrefixes = radiusMeters === null ? [] : getGridPrefixesForRange(latitude, longitude, rangeValue);
    let deviceHash: string | null = null;
    try {
      deviceHash = typeof body.deviceHash === 'string' ? validateDeviceHash(body.deviceHash) : null;
    } catch {
      deviceHash = null;
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const locale = normalizeContentLocale(body.locale);
    const countryCode = typeof body.countryCode === 'string' && /^[A-Za-z]{2}$/.test(body.countryCode)
      ? body.countryCode.toUpperCase()
      : null;
    const supabase = createAdminClient();

    let flameQuery = supabase
      .from('flames')
      .select('id, text, tag_label, tag_normalized, category, mood, self_strength, heat_score, status, created_at, live_until, ember_until, trace_until, expires_at, extension_count, character_key, character_emoji, region_label, region_code, display_scope, source_locale, country_code, geohash, device_hash')
      .eq('status', 'live')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(80);

    if (radiusMeters !== null) {
      flameQuery = flameQuery.or(gridPrefixes.map((prefix) => `geohash.like.${prefix}%`).join(','));
    }
    if (countryCode && rangeValue === 'national') {
      flameQuery = flameQuery.eq('country_code', countryCode);
    }

    const { data, error } = await flameQuery;

    if (error) throw new PublitHttpError('NEARBY_FLAMES_FAILED', 500);
    const flameRows = (data ?? []).filter((flame) => {
      if (radiusMeters === null) return true;
      const cell = getGridRelativePosition(flame.geohash, latitude, longitude);
      if (!cell) return false;
      const cellRadiusMeters = getGridCellRadiusMeters(flame.geohash) ?? 25;
      return Math.hypot(cell.northMeters, cell.eastMeters) <= radiusMeters + cellRadiusMeters;
    });
    const flameIds = flameRows.map((flame) => flame.id).filter(Boolean);
    const reactionRowsByFlame = new Map<string, Array<Record<string, unknown>>>();
    const translationsByFlame = new Map<string, string>();

    if (flameIds.length) {
      const { data: translationRows, error: translationError } = await supabase
        .from('flame_translations')
        .select('flame_id, translated_text')
        .in('flame_id', flameIds)
        .eq('locale', locale);
      if (translationError) throw new PublitHttpError('TRANSLATION_LOOKUP_FAILED', 500);
      for (const translation of translationRows ?? []) {
        translationsByFlame.set(String(translation.flame_id), String(translation.translated_text ?? ''));
      }

      const { data: reactionRows, error: reactionError } = await supabase
        .from('flame_reactions')
        .select('flame_id, reaction_type, reaction_label, device_hash')
        .in('flame_id', flameIds);
      if (reactionError) throw new PublitHttpError('REACTION_SUMMARY_FAILED', 500);

      for (const reactionRow of reactionRows ?? []) {
        const flameId = String(reactionRow.flame_id ?? '');
        if (!flameId) continue;
        const rows = reactionRowsByFlame.get(flameId) ?? [];
        rows.push(reactionRow);
        reactionRowsByFlame.set(flameId, rows);
      }
    }

    return json(flameRows
      .map((flame) => {
        const response = sanitizeFlameForResponse(flame, now);
        const translatedText = translationsByFlame.get(String(flame.id));
        if (translatedText && translatedText !== flame.text) {
          response.originalText = flame.text;
          response.text = translatedText;
          response.translationLocale = locale;
        }
        return {
          ...response,
          ...(radiusMeters !== null ? { relativePosition: getGridRelativePosition(flame.geohash, latitude, longitude) } : {}),
          ownedByDevice: Boolean(deviceHash && flame.device_hash === deviceHash),
          reactions: summarizeReactionRows(reactionRowsByFlame.get(String(flame.id)) ?? [], deviceHash),
        };
      })
      .filter((flame) => flame.lifecycle === 'live'));
  } catch (error) {
    return handleError(error);
  }
});
