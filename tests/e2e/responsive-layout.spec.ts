import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function expectComposerSheetUsable(page: Page, sheet: Locator) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const sheetBox = await requiredBox(sheet);
  expect(sheetBox.height).toBeLessThanOrEqual(viewport!.height * 0.61);
  await expect(sheet.getByRole('textbox', { name: '직접 이모지' })).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: '직접 이모지 추가' })).toBeVisible();

  const tagInput = sheet.getByLabel('생각 태그');
  await tagInput.focus();
  expectInside(await requiredBox(tagInput), await requiredBox(sheet));
}

async function installMobileBrowserChromeViewport(page: Page, visualHeight: number) {
  await page.addInitScript((height) => {
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const viewport = {
      width: 390,
      height,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        const next = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        next.add(listener);
        listeners.set(type, next);
      },
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        for (const listener of listeners.get(event.type) ?? []) {
          if (typeof listener === 'function') listener.call(viewport, event);
          else listener.handleEvent(event);
        }
        return true;
      },
    };

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });
  }, visualHeight);
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
  const toolbar = page.getByTestId('composer-toolbar');
  const tagBadge = page.getByTestId('composer-tag-badge');
  const toneBadge = page.getByTestId('composer-tone-badge');
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
  const toolbarBox = await requiredBox(toolbar);
  const tagBadgeBox = await requiredBox(tagBadge);
  const toneBadgeBox = await requiredBox(toneBadge);

  expect(topBarBox.height).toBeLessThanOrEqual(58);
  expect(tickerBox.width).toBeGreaterThan(brandBox.width);
  expect(Math.abs(topBarBox.width - composerBox.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(topBarBox.x - composerBox.x)).toBeLessThanOrEqual(2);
  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, composerBox, 16);
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);
  await expect(toolbar).toHaveCSS('overflow-x', 'visible');
  expect(tagBadgeBox.height).toBeLessThanOrEqual(32);
  expect(toneBadgeBox.height).toBeLessThanOrEqual(32);
  expectInside(tagBadgeBox, toolbarBox);
  expectInside(toneBadgeBox, toolbarBox);

  await rangeButton.click();
  const rangeBox = await requiredBox(page.getByTestId('range-control'));
  expectInside(rangeBox, shellBox);

  await composer.getByRole('textbox', { name: '지금 떠오른 생각' }).click();
  await expect(page.getByTestId('bottom-sheet-panel')).toHaveCount(0);
  await composer.getByRole('button', { name: '작성 옵션' }).click();
  const detailsDialog = page.getByRole('dialog', { name: '생각 자세히 띄우기' });
  const detailsSheet = page.getByTestId('bottom-sheet-panel');
  await expect(detailsSheet).toBeVisible();
  await expect(detailsDialog).toHaveCSS('backdrop-filter', 'none');
  await expect(page.getByTestId('composer-options-panel')).toHaveCount(0);
  await expect(page.getByText('내 생각')).toBeVisible();
  await expectComposerSheetUsable(page, detailsSheet);
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
  const toolbar = page.getByTestId('composer-toolbar');
  const tagBadge = page.getByTestId('composer-tag-badge');
  const toneBadge = page.getByTestId('composer-tone-badge');
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
  const toolbarBox = await requiredBox(toolbar);
  const tagBadgeBox = await requiredBox(tagBadge);
  const toneBadgeBox = await requiredBox(toneBadge);

  expect(shellBox.width).toBeLessThanOrEqual(390);
  expect(topBarBox.height).toBeLessThanOrEqual(58);
  expect(composerBox.height).toBeLessThanOrEqual(132);
  expect(tickerBox.width).toBeGreaterThan(brandBox.width);
  expect(Math.abs(topBarBox.width - composerBox.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(topBarBox.x - composerBox.x)).toBeLessThanOrEqual(2);
  expectInside(thoughtBox, shellBox);
  expectBelow(thoughtBox, composerBox, 12);
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height - 8);
  await expect(toolbar).toHaveCSS('overflow-x', 'visible');
  expect(tagBadgeBox.height).toBeLessThanOrEqual(32);
  expect(toneBadgeBox.height).toBeLessThanOrEqual(32);
  expectInside(tagBadgeBox, toolbarBox);
  expectInside(toneBadgeBox, toolbarBox);

  await rangeButton.click();
  const rangeBox = await requiredBox(page.getByTestId('range-control'));
  expectInside(rangeBox, shellBox);

  await composer.getByRole('textbox', { name: '지금 떠오른 생각' }).click();
  await expect(page.getByTestId('bottom-sheet-panel')).toHaveCount(0);
  await composer.getByRole('button', { name: '작성 옵션' }).click();
  const detailsDialog = page.getByRole('dialog', { name: '생각 자세히 띄우기' });
  const detailsSheet = page.getByTestId('bottom-sheet-panel');
  await expect(detailsSheet).toBeVisible();
  await expect(detailsDialog).toHaveCSS('backdrop-filter', 'none');
  await expect(page.getByTestId('composer-options-panel')).toHaveCount(0);
  await expect(page.getByText('내 생각')).toBeVisible();
  await expectComposerSheetUsable(page, detailsSheet);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('keeps the composer detail sheet above mobile browser chrome and isolates tag input taps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMobileBrowserChromeViewport(page, 700);
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const composer = page.getByTestId('inline-thought-composer');
  await composer.getByRole('button', { name: '작성 옵션' }).click();

  const sheet = page.getByTestId('bottom-sheet-panel');
  const dialog = page.getByTestId('bottom-sheet-dialog');
  await expect(sheet).toBeVisible();
  await expect(dialog).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.waitForTimeout(450);

  const visibleViewport = await page.evaluate(() => {
    const viewport = window.visualViewport;
    return {
      bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      height: viewport?.height ?? window.innerHeight,
      top: viewport?.offsetTop ?? 0,
    };
  });
  const dialogBox = await requiredBox(dialog);
  expect(dialogBox.y).toBeCloseTo(visibleViewport.top, 1);
  expect(dialogBox.height).toBeCloseTo(visibleViewport.height, 1);

  const sheetBox = await requiredBox(sheet);
  expect(sheetBox.y + sheetBox.height).toBeCloseTo(visibleViewport.bottom, 1);
  expect(sheetBox.height).toBeLessThanOrEqual(700 * 0.61);

  const submitButton = sheet.getByRole('button', { name: '생각 띄우기', exact: true });
  await expect(submitButton).toBeVisible();
  const submitBox = await requiredBox(submitButton);
  expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(visibleViewport.bottom + 1);

  await expect(page.getByTestId('composer-tag-preview')).toHaveAttribute('data-tone', 'spark');
  const tagInput = sheet.getByLabel('생각 태그');
  await tagInput.click();
  await tagInput.fill('#모바일태그');
  await expect(tagInput).toHaveValue('#모바일태그');
  await expect(page.getByTestId('composer-tag-preview')).toHaveAttribute('data-tone', 'spark');
});
