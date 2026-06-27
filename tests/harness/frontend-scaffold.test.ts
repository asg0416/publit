import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('../..', import.meta.url).pathname;

describe('Publit frontend scaffold', () => {
  it('has Next.js App Router, Tailwind, TypeScript, and Playwright entrypoints', () => {
    for (const file of [
      'app/layout.tsx',
      'app/page.tsx',
      'app/globals.css',
      'next.config.ts',
      'tsconfig.json',
      'postcss.config.mjs',
      'playwright.config.ts',
      'tests/e2e/no-map-sdk.spec.ts',
      'tests/e2e/radar-home.spec.ts',
    ]) {
      assert.equal(existsSync(join(projectRoot, file)), true, `${file} is missing`);
    }
  });

  it('exposes app, build, lint, and e2e scripts', () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

    assert.equal(packageJson.scripts.dev, 'next dev');
    assert.equal(packageJson.scripts.build, 'next build');
    assert.equal(packageJson.scripts.lint, 'eslint .');
    assert.equal(packageJson.scripts.e2e, 'playwright test');
  });

  it('does not include map SDK dependencies', () => {
    const packageJson = readFileSync(join(projectRoot, 'package.json'), 'utf8').toLowerCase();

    for (const forbidden of ['@googlemaps', 'google.maps', 'mapbox', 'leaflet', 'kakao.maps', 'naver.maps']) {
      assert.equal(packageJson.includes(forbidden), false, `${forbidden} must not be installed`);
    }
  });
});
