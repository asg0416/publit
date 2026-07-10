import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;
const functionsDir = join(projectRoot, 'supabase', 'functions');
const functionNames = [
  'create-flame',
  'nearby-flames',
  'react-flame',
  'report-flame',
  'my-flames',
  'extinguish-flame',
  'expire-flames',
  'get-hot-topics',
  'suggest-tags',
  'create-comment',
  'get-comments',
  'extend-flame',
  'admin-reports',
  'admin-resolve-report',
];

const sourceFiles = readdirSync(functionsDir, { recursive: true })
  .filter((file) => String(file).endsWith('.ts'))
  .map((file) => join(functionsDir, String(file)));

const source = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

describe('Publit Edge Function contract', () => {
  it('provides every MVP Edge Function entrypoint', () => {
    for (const functionName of functionNames) {
      assert.equal(existsSync(join(functionsDir, functionName, 'index.ts')), true, `${functionName} index.ts missing`);
    }
  });

  it('does not import or mention map SDKs', () => {
    const packageJson = readFileSync(join(projectRoot, 'package.json'), 'utf8').toLowerCase();
    const combined = `${packageJson}\n${source.toLowerCase()}`;

    for (const forbidden of ['google.maps', '@googlemaps', 'naver.maps', 'kakao.maps', 'mapbox', 'leaflet']) {
      assert.equal(combined.includes(forbidden), false, `${forbidden} must not be used`);
    }
  });

  it('uses server-side grid derivation and response sanitizers instead of raw coordinate persistence', () => {
    assert.match(source, /encodeGrid/);
    assert.match(source, /sanitizeFlameForResponse/);
    assert.match(source, /character_key/);
    assert.match(source, /display_scope/);
    assert.match(source, /region_code/);
    assert.doesNotMatch(source, /\.insert\([^)]*(lat|lng|latitude|longitude|coordinates|raw_location)/is);
    assert.doesNotMatch(source, /json\([^)]*(reactionCount|reportCount|viewCount|userCount)/is);
  });

  it('guards write actions with device_hash, duplicate checks, and rate limits', () => {
    for (const functionName of ['create-flame', 'react-flame', 'report-flame', 'extinguish-flame', 'create-comment', 'extend-flame']) {
      const body = readFileSync(join(functionsDir, functionName, 'index.ts'), 'utf8');

      assert.match(body, /deviceHash|device_hash/);
      assert.match(body, /assertActionAllowed|isRateLimited/);
    }

    assert.match(readFileSync(join(functionsDir, 'create-flame', 'index.ts'), 'utf8'), /FLAME_SLOT_FULL/);
    assert.match(readFileSync(join(functionsDir, 'react-flame', 'index.ts'), 'utf8'), /flame_id,\s*device_hash,\s*reaction_type|duplicate/i);
    assert.match(readFileSync(join(functionsDir, 'react-flame', 'index.ts'), 'utf8'), /reactionLabel|reaction_label/);
    assert.match(readFileSync(join(functionsDir, 'report-flame', 'index.ts'), 'utf8'), /reported|hidden/);
  });

  it('queries nearby thoughts with selected-range grid coverage instead of one center cell', () => {
    const nearbySource = readFileSync(join(functionsDir, 'nearby-flames', 'index.ts'), 'utf8');

    assert.doesNotMatch(nearbySource, /geohash\.slice\(0,\s*5\)/);
    assert.match(nearbySource, /getGridPrefixesForRange/);
    assert.match(nearbySource, /geohash\.like/);
    assert.match(nearbySource, /getGridCellRadiusMeters/);
  });

  it('keeps the service role key server-only', () => {
    assert.match(source, /Deno\.env\.get\(['"]SUPABASE_SERVICE_ROLE_KEY['"]\)/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('protects admin functions with a server-side admin token', () => {
    assert.match(source, /Deno\.env\.get\(['"]ADMIN_TOKEN['"]\)/);
    assert.match(source, /x-admin-token/i);
    assert.doesNotMatch(source, /NEXT_PUBLIC_ADMIN_TOKEN/);
  });

  it('derives trends and suggestions from real thought rows', () => {
    const hotTopicsSource = readFileSync(join(functionsDir, 'get-hot-topics', 'index.ts'), 'utf8');
    const suggestTagsSource = readFileSync(join(functionsDir, 'suggest-tags', 'index.ts'), 'utf8');

    assert.match(hotTopicsSource, /\.from\('flames'\)/);
    assert.match(suggestTagsSource, /\.from\('flames'\)/);
  });
});
