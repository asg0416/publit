import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;

describe('Publit harness engineering project setup', () => {
  it('has an explicit root harness guide and machine-readable harness manifest', () => {
    assert.equal(existsSync(join(projectRoot, 'HARNESS.md')), true);
    assert.equal(existsSync(join(projectRoot, 'harness.config.json')), true);

    const guide = readFileSync(join(projectRoot, 'HARNESS.md'), 'utf8');
    assert.match(guide, /privacy/i);
    assert.match(guide, /rate-limit/i);
    assert.match(guide, /lifecycle/i);
    assert.match(guide, /no-map/i);
    assert.match(guide, /raw lat\/lng/i);
  });

  it('exposes harness commands from package scripts', () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

    assert.equal(packageJson.scripts['harness:test'], 'node --test tests/harness/*.test.ts');
    assert.equal(packageJson.scripts['harness:verify'], 'node scripts/harness-verify.mjs');
    assert.equal(packageJson.scripts['harness:smoke:tags'], 'node scripts/smoke-edge-function.mjs');
    assert.equal(packageJson.scripts['harness:smoke:create'], 'node scripts/smoke-create-extinguish.mjs');
  });

  it('records the current MVP harness gates without requiring secret keys in git', () => {
    const manifest = JSON.parse(readFileSync(join(projectRoot, 'harness.config.json'), 'utf8'));

    assert.equal(manifest.project, 'Publit');
    assert.equal(manifest.forbidden.mapSdkAllowed, false);
    assert.deepEqual(manifest.privacy.neverPersist, ['lat', 'lng', 'latitude', 'longitude', 'coordinates', 'raw_location']);
    assert.equal(manifest.remoteSmoke.requiresServiceRoleKey, false);
    assert.equal(manifest.remoteSmoke.requiresPublishableKey, true);
    assert.equal(manifest.lifecycle.order.join('>'), 'live>ember>trace>expired');
  });
});
