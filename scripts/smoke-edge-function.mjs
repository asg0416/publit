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

const env = readEnv(new URL('../.env.local', import.meta.url));
const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/suggest-tags`, {
  method: 'POST',
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    text: '부산 카페에서 선거랑 투표 얘기를 들었다',
    lat: 35.1795,
    lng: 129.0756,
  }),
});

const body = await response.text();
console.log(JSON.stringify({
  status: response.status,
  ok: response.ok,
  body,
}));

if (!response.ok) {
  process.exitCode = 1;
}
