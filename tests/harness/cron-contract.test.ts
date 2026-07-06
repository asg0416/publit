import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;

describe('Anigeunde scheduled expiration contract', () => {
  it('configures a protected Vercel Cron route for expiring old thoughts', () => {
    const vercelConfigPath = join(projectRoot, 'vercel.json');
    const routePath = join(projectRoot, 'app', 'api', 'cron', 'expire-flames', 'route.ts');

    assert.equal(existsSync(vercelConfigPath), true, 'vercel.json missing');
    assert.equal(existsSync(routePath), true, 'expire-flames cron route missing');

    const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf8')) as { crons?: Array<{ path: string; schedule: string }> };
    assert.deepEqual(vercelConfig.crons, [
      { path: '/api/cron/expire-flames', schedule: '0 * * * *' },
    ]);

    const routeSource = readFileSync(routePath, 'utf8');
    assert.match(routeSource, /CRON_SECRET/);
    assert.match(routeSource, /Authorization/);
    assert.match(routeSource, /expire-flames/);
    assert.doesNotMatch(routeSource, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_ADMIN_TOKEN/);
  });
});
