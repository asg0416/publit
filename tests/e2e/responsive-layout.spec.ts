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
  const topBar = page.getByTestId('top-brand-bar');
  const brand = page.getByTestId('brand-logo');
  const ticker = page.getByTestId('hot-tag-ticker');
  const map = page.getByTestId('mapglot-background');
  const thoughtMap = page.getByTestId('thought-map');
  const composer = page.getByTestId('inline-thought-composer');
  const rangeButton = page.getByRole('button', { name: '반경 설정' });

  await expect(map).toBeVisible();
  await expect(thoughtMap).toBeVisible();
  await expect(page.getByTestId('thought-character')).toHaveCount(2);
  await expect(page.getByTestId('summary-panel')).toHaveCount(0);
  await expect(page.getByTestId('range-control')).toHaveCount(0);
  await expect(rangeButton).toBeVisible();

  const shellBox = await requiredBox(shell);
  const topBarBox = await requiredBox(topBar);
  const brandBox = await requiredBox(brand);
  const tickerBox = await requiredBox(ticker);
  const thoughtBox = await requiredBox(thoughtMap);
  const composerBox = await requiredBox(composer);

  expect(topBarBox.height).toBeLessThanOrEqual(58);
  expect(tickerBox.width).toBeGreaterThan(brandBox.width);
  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, composerBox, 16);
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);

  await rangeButton.click();
  const rangeBox = await requiredBox(page.getByTestId('range-control'));
  expectInside(rangeBox, shellBox);

  await composer.getByRole('textbox', { name: '지금 떠오른 생각' }).click();
  await expect(page.getByTestId('bottom-sheet-panel')).toHaveCount(0);
});

test('keeps the full map controls separated on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const shell = page.getByTestId('publit-shell');
  const topBar = page.getByTestId('top-brand-bar');
  const brand = page.getByTestId('brand-logo');
  const ticker = page.getByTestId('hot-tag-ticker');
  const thoughtMap = page.getByTestId('thought-map');
  const composer = page.getByTestId('inline-thought-composer');
  const rangeButton = page.getByRole('button', { name: '반경 설정' });

  await expect(page.getByTestId('mapglot-background')).toBeVisible();
  await expect(page.getByTestId('thought-character')).toHaveCount(2);
  await expect(page.getByTestId('summary-panel')).toHaveCount(0);
  await expect(page.getByTestId('range-control')).toHaveCount(0);
  await expect(rangeButton).toBeVisible();

  const shellBox = await requiredBox(shell);
  const topBarBox = await requiredBox(topBar);
  const brandBox = await requiredBox(brand);
  const tickerBox = await requiredBox(ticker);
  const thoughtBox = await requiredBox(thoughtMap);
  const composerBox = await requiredBox(composer);

  expect(shellBox.width).toBeLessThanOrEqual(390);
  expect(topBarBox.height).toBeLessThanOrEqual(58);
  expect(composerBox.height).toBeLessThanOrEqual(124);
  expect(tickerBox.width).toBeGreaterThan(brandBox.width);
  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, composerBox, 12);
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);

  await rangeButton.click();
  const rangeBox = await requiredBox(page.getByTestId('range-control'));
  expectInside(rangeBox, shellBox);

  await composer.getByRole('textbox', { name: '지금 떠오른 생각' }).click();
  await expect(page.getByTestId('bottom-sheet-panel')).toHaveCount(0);
});
