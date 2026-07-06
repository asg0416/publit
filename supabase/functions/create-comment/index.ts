import { detectBlockedContent, sanitizeCommentForResponse, validateCommentBody, validateDeviceHash } from '../_shared/publit.ts';
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
    const commentBody = validateCommentBody(body.body);
    const blocked = detectBlockedContent(commentBody);
    if (blocked.blocked) throw new PublitHttpError('CONTENT_BLOCKED', 400, 'CONTENT_BLOCKED', blocked.reason);

    const supabase = createAdminClient();
    await assertActionAllowed(supabase, deviceHash, 'create_comment');

    const { data: flame, error: flameError } = await supabase
      .from('flames')
      .select('id, status, expires_at')
      .eq('id', flameId)
      .single();
    if (flameError || !flame || ['hidden', 'reported', 'expired', 'extinguished'].includes(flame.status)) {
      throw new PublitHttpError('FLAME_NOT_COMMENTABLE', 404);
    }
    if (flame.expires_at && new Date(flame.expires_at).getTime() <= Date.now()) {
      throw new PublitHttpError('FLAME_EXPIRED', 410);
    }

    const { data: comment, error: insertError } = await supabase
      .from('flame_comments')
      .insert({
        flame_id: flameId,
        device_hash: deviceHash,
        body: commentBody,
        status: 'visible',
      })
      .select('id, body, created_at')
      .single();
    if (insertError) throw new PublitHttpError('COMMENT_CREATE_FAILED', 500);

    await recordAction(supabase, deviceHash, 'create_comment');
    return json({ comment: sanitizeCommentForResponse(comment) }, 201);
  } catch (error) {
    return handleError(error);
  }
});
