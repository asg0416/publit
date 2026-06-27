import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { isRateLimited } from './publit.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export class PublitHttpError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, status: number, message = code, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new PublitHttpError('SERVER_MISCONFIGURED', 500);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (req.method === 'OPTIONS') return {};
  if (req.method !== 'POST') throw new PublitHttpError('METHOD_NOT_ALLOWED', 405);

  try {
    return await req.json();
  } catch {
    throw new PublitHttpError('INVALID_JSON', 400);
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof PublitHttpError) {
    return json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }

  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  return json({ error: { code: message, message } }, 400);
}

export async function assertActionAllowed(
  supabase: ReturnType<typeof createAdminClient>,
  deviceHash: string,
  actionType: 'create_flame' | 'react_flame' | 'report_flame' | 'extinguish_flame',
  now = new Date(),
) {
  const since = new Date(now.getTime() - 60_000).toISOString();
  const { data, error } = await supabase
    .from('action_events')
    .select('created_at')
    .eq('device_hash', deviceHash)
    .eq('action_type', actionType)
    .gt('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new PublitHttpError('RATE_LIMIT_LOOKUP_FAILED', 500);

  const limit = isRateLimited((data ?? []).map((row) => row.created_at), now);
  if (limit.limited) {
    throw new PublitHttpError(limit.code ?? 'ACTION_RATE_LIMIT', 429);
  }
}

export async function recordAction(
  supabase: ReturnType<typeof createAdminClient>,
  deviceHash: string,
  actionType: 'create_flame' | 'react_flame' | 'report_flame' | 'extinguish_flame',
) {
  const { error } = await supabase.from('action_events').insert({
    device_hash: deviceHash,
    action_type: actionType,
  });

  if (error) throw new PublitHttpError('ACTION_RECORD_FAILED', 500);
}
