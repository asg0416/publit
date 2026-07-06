export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: 'Supabase env missing' }, { status: 500 });
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/expire-flames`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ source: 'vercel-cron' }),
  });

  const payload = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) {
    return Response.json({ error: 'Expire function failed', details: payload }, { status: 502 });
  }

  return Response.json({ ok: true, details: payload });
}
