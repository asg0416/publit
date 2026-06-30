import { expect, test, type Locator } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();
const thoughts = [
  {
    id: 'responsive-1',
    text: '지도 위에서 태그가 잘 보여야 해요.',
    tagLabel: '#카페대화',
    tagNormalized: '카페대화',
    category: 'daily',
    mood: 'curious',
    selfStrength: 2,
    heatLabel: '근처에서 자주 보여요',
    lifecycle: 'live',
    characterKey: 'turtle',
    displayScope: 'nearby',
    regionLabel: '근처',
    regionCode: 'nearby',
    createdAt: now,
  },
  {
    id: 'responsive-2',
    text: '하단 컨트롤과 겹치면 안 돼요.',
    tagLabel: '#지역교통',
    tagNormalized: '지역교통',
    category: 'local',
    mood: 'quiet',
    selfStrength: 1,
    heatLabel: '방금 떠오른 생각',
    lifecycle: 'live',
    characterKey: 'fox',
    displayScope: 'nearby',
    regionLabel: '근처',
    regionCode: 'nearby',
    createdAt: now,
  },
];

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function requiredBox(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function expectBelow(upper: Box, lower: Box, gap = 4) {
  expect(upper.y + upper.height).toBeLessThanOrEqual(lower.y - gap);
}

function expectInside(inner: Box, outer: Box) {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const position = {
      coords: { latitude: 35.1795, longitude: 129.0756, accuracy: 40, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    };
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          success(position as GeolocationPosition);
        },
        clearWatch() {},
      },
    });
  });

  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [{ displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'local', heatLabel: '근처에서 자주 보여요' }] });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: thoughts });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
});

test('keeps the full map controls separated on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const shell = page.getByTestId('publit-shell');
  const map = page.getByTestId('mapglot-background');
  const thoughtMap = page.getByTestId('thought-map');
  const rangeControl = page.getByTestId('range-control');
  const summaryPanel = page.getByTestId('summary-panel');
  const composeToolbar = page.getByTestId('thought-compose-toolbar');

  await expect(map).toBeVisible();
  await expect(thoughtMap).toBeVisible();
  await expect(page.getByTestId('thought-character')).toHaveCount(2);

  const shellBox = await requiredBox(shell);
  const thoughtBox = await requiredBox(thoughtMap);
  const rangeBox = await requiredBox(rangeControl);
  const summaryBox = await requiredBox(summaryPanel);
  const toolbarBox = await requiredBox(composeToolbar);

  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, rangeBox, 12);
  expectBelow(rangeBox, summaryBox, 8);
  expectBelow(summaryBox, toolbarBox, 8);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);

  await composeToolbar.click();
  const sheetBox = await requiredBox(page.getByTestId('bottom-sheet-panel'));
  expect(sheetBox.width).toBeLessThanOrEqual(560);
  expect(sheetBox.x).toBeGreaterThan(300);
});

test('keeps the full map controls separated on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const shell = page.getByTestId('publit-shell');
  const thoughtMap = page.getByTestId('thought-map');
  const rangeControl = page.getByTestId('range-control');
  const summaryPanel = page.getByTestId('summary-panel');
  const composeToolbar = page.getByTestId('thought-compose-toolbar');

  await expect(page.getByTestId('mapglot-background')).toBeVisible();
  await expect(page.getByTestId('thought-character')).toHaveCount(2);

  const shellBox = await requiredBox(shell);
  const thoughtBox = await requiredBox(thoughtMap);
  const rangeBox = await requiredBox(rangeControl);
  const summaryBox = await requiredBox(summaryPanel);
  const toolbarBox = await requiredBox(composeToolbar);

  expect(shellBox.width).toBeLessThanOrEqual(390);
  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, rangeBox, 8);
  expectBelow(rangeBox, summaryBox, 6);
  expectBelow(summaryBox, toolbarBox, 6);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);

  await composeToolbar.click();
  const sheetBox = await requiredBox(page.getByTestId('bottom-sheet-panel'));
  expect(sheetBox.width).toBeGreaterThan(340);
  expect(sheetBox.x).toBeLessThan(8);
});
