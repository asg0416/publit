import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function readEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function invoke(env, slug, payload) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  return { status: response.status, ok: response.ok, body };
}

const env = readEnv(new URL('../.env.local', import.meta.url));
const deviceHash = createHash('sha256').update(`publit-smoke-${Date.now()}`).digest('hex');

const create = await invoke(env, 'create-flame', {
  text: '스모크 테스트 불꽃입니다',
  tagLabel: '#스모크테스트',
  category: 'other',
  mood: 'quiet',
  selfStrength: 1,
  lat: 35.1795,
  lng: 129.0756,
  deviceHash,
});

const createBody = JSON.parse(create.body);
const leakedLocation = /35\.1795|129\.0756|lat|lng|coordinates|raw_location/i.test(create.body);
if (!create.ok || leakedLocation || !createBody.flame?.id) {
  console.log(JSON.stringify({ step: 'create-flame', status: create.status, ok: create.ok, leakedLocation, body: create.body }));
  process.exit(1);
}

const extinguish = await invoke(env, 'extinguish-flame', {
  flameId: createBody.flame.id,
  deviceHash,
});

console.log(JSON.stringify({
  create: { status: create.status, ok: create.ok, leakedLocation },
  extinguish: { status: extinguish.status, ok: extinguish.ok, body: extinguish.body },
}));

if (!extinguish.ok) {
  process.exitCode = 1;
}
