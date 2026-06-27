import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const scannedRoots = ['app', 'components', 'lib', 'package.json', 'package-lock.json'];
const forbiddenPatterns = [
  /@googlemaps/i,
  /google\.maps/i,
  /mapbox/i,
  /leaflet/i,
  /kakao\.maps/i,
  /naver\.maps/i,
];

function collectFiles(path: string): string[] {
  const absolute = join(projectRoot, path);
  const stats = statSync(absolute);
  if (stats.isFile()) return [absolute];

  return readdirSync(absolute).flatMap((entry) => {
    const next = join(path, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') return [];
    return collectFiles(next);
  });
}

test('repository does not ship map SDKs or map widgets', async () => {
  const files = scannedRoots.flatMap(collectFiles);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      expect(source, `${file} must not contain ${pattern}`).not.toMatch(pattern);
    }
  }
});
