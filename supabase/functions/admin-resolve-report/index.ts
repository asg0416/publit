import { validateAdminReportAction } from '../_shared/publit.ts';
import { assertAdminToken, createAdminClient, handleError, json, PublitHttpError, readJson } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    assertAdminToken(req);
    const body = await readJson(req);
    const reportId = String(body.reportId ?? '');
    if (!reportId) throw new PublitHttpError('INVALID_REPORT_ID', 400);

    const action = validateAdminReportAction(body.action);
    const adminNote = body.adminNote ? String(body.adminNote).slice(0, 240) : null;
    const supabase = createAdminClient();

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, flame_id')
      .eq('id', reportId)
      .single();
    if (reportError || !report) throw new PublitHttpError('REPORT_NOT_FOUND', 404);

    const { error: reviewError } = await supabase.from('report_reviews').insert({
      report_id: report.id,
      flame_id: report.flame_id,
      action,
      admin_note: adminNote,
    });
    if (reviewError) throw new PublitHttpError('REPORT_REVIEW_CREATE_FAILED', 500);

    const reviewedAt = new Date().toISOString();
    const { error: markReviewedError } = await supabase
      .from('reports')
      .update({ reviewed_at: reviewedAt, review_action: action })
      .eq('id', report.id);
    if (markReviewedError) throw new PublitHttpError('REPORT_REVIEW_STATUS_FAILED', 500);

    if (action === 'delete') {
      const { error: deleteError } = await supabase.from('flames').delete().eq('id', report.flame_id);
      if (deleteError) throw new PublitHttpError('REPORT_DELETE_FAILED', 500);
    } else {
      const nextStatus = action === 'hide' ? 'hidden' : 'live';
      const { error: updateError } = await supabase
        .from('flames')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', report.flame_id);
      if (updateError) throw new PublitHttpError('REPORT_RESOLVE_FAILED', 500);
    }

    return json({ ok: true, action });
  } catch (error) {
    return handleError(error);
  }
});
