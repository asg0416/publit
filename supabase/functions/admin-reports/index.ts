import { assertAdminToken, createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    assertAdminToken(req);
    await readJson(req);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('reports')
      .select('id, flame_id, reason, detail, created_at, flames!inner(id, text, tag_label, tag_normalized, status, heat_score, created_at)')
      .is('reviewed_at', null)
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw new PublitHttpError('ADMIN_REPORTS_FAILED', 500);

    return json((data ?? []).map((report) => ({
      id: report.id,
      flameId: report.flame_id,
      reason: report.reason,
      detail: report.detail,
      createdAt: report.created_at,
      thought: {
        id: report.flames.id,
        text: report.flames.text,
        tagLabel: report.flames.tag_label,
        tagNormalized: report.flames.tag_normalized,
        status: report.flames.status,
        heatScore: Number(report.flames.heat_score ?? 0),
        createdAt: report.flames.created_at,
      },
    })));
  } catch (error) {
    return handleError(error);
  }
});
