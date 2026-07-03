import { expect, test, type Page } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();

const hotTopics = [
  { displayLabel: '#지금생각', normalizedKey: '지금생각', category: 'daily', scope: 'global', heatLabel: '요즘 이 태그가 모여요' },
];

const nearbyFlames = [
  {
    id: 'flame-nearby',
    text: '권한을 누른 뒤에만 보이는 근처 생각이에요.',
    tagLabel: '#지금생각',
    tagNormalized: '지금생각',
    category: 'daily',
    mood: 'curious',
    selfStrength: 2,
    heatLabel: '방금 떠오른 생각',
    lifecycle: 'live',
    characterKey: 'fox',
    displayScope: 'nearby',
    regionLabel: '근처',
    regionCode: 'nearby',
    createdAt: now,
  },
];

type GeolocationCalls = {
  getCurrentPositionCalls: number;
  watchPositionCalls: number;
  clearWatchCalls: number;
};

async function mockCommonRoutes(page: Page) {
  let hotTopicRequests = 0;

  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    hotTopicRequests += 1;
    await route.fulfill({ status: 200, json: hotTopics });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: nearbyFlames });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });

  return { hotTopicRequests: () => hotTopicRequests };
}

async function installGeolocationMock(page: Page, mode: 'granted' | 'prompt' | 'unavailable' | 'unavailable-then-watch' | 'timeout-then-watch' | 'timeout-then-watch-error-then-success' | 'timeout-then-slow-watch' = 'prompt') {
  await page.addInitScript((selectedMode) => {
    const calls = {
      getCurrentPositionCalls: 0,
      watchPositionCalls: 0,
      clearWatchCalls: 0,
    };
    const position = {
      coords: {
        latitude: 35.1795,
        longitude: 129.0756,
        accuracy: 40,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    const unavailableError = {
      code: 2,
      message: 'Position unavailable on desktop',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };
    const timeoutError = {
      code: 3,
      message: 'Desktop geolocation timed out before network location settled',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    Object.defineProperty(window, '__publitGeolocationCalls', {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        async query() {
          return { name: 'geolocation', state: selectedMode === 'granted' ? 'granted' : 'prompt', onchange: null };
        },
      },
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback) {
          calls.getCurrentPositionCalls += 1;
          window.setTimeout(() => {
            if (selectedMode === 'unavailable' || selectedMode === 'unavailable-then-watch') error?.(unavailableError as GeolocationPositionError);
            else if (selectedMode === 'timeout-then-watch' || selectedMode === 'timeout-then-watch-error-then-success' || selectedMode === 'timeout-then-slow-watch') error?.(timeoutError as GeolocationPositionError);
            else success(position as GeolocationPosition);
          }, 0);
        },
        watchPosition(success: PositionCallback, error?: PositionErrorCallback) {
          calls.watchPositionCalls += 1;
          const watchId = calls.watchPositionCalls;
          if (selectedMode === 'timeout-then-watch-error-then-success') {
            window.setTimeout(() => error?.(timeoutError as GeolocationPositionError), 0);
            window.setTimeout(() => success(position as GeolocationPosition), 4_000);
            return watchId;
          }
          window.setTimeout(() => {
            if (selectedMode === 'unavailable') error?.(unavailableError as GeolocationPositionError);
            else success(position as GeolocationPosition);
          }, selectedMode === 'timeout-then-slow-watch' ? 9_000 : 0);
          return watchId;
        },
        clearWatch() {
          calls.clearWatchCalls += 1;
        },
      },
    });
  }, mode);
}

async function readGeolocationCalls(page: Page): Promise<GeolocationCalls> {
  return page.evaluate(() => (
    window as unknown as { __publitGeolocationCalls: GeolocationCalls }
  ).__publitGeolocationCalls);
}

test('requests browser location only after an explicit user action without starting a continuous desktop watch', async ({ page }) => {
  await installGeolocationMock(page, 'prompt');
  const routes = await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /위치 허용/ })).toBeVisible();
  await expect.poll(routes.hotTopicRequests).toBeGreaterThan(0);

  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 0,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });

  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });
  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});

test('does not describe desktop position lookup failures as missing permission after the user allows location', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('권한은 요청됐지만 현재 위치를 가져오지 못했어요.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '조용히 둘러보기' })).toHaveCount(0);

  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});

test('falls back to a desktop watch when the first allowed lookup is temporarily unavailable', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable-then-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});

test('keeps waiting for a slower desktop watch instead of timing out immediately', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-slow-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('위치 확인 시간이 초과됐어요.')).toHaveCount(0);
  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 12_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 12_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});

test('keeps waiting when desktop watch emits a transient error before succeeding', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-watch-error-then-success');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('위치 확인 시간이 초과됐어요.')).toHaveCount(0);
  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 8_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 8_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});

test('falls back to a short watch when desktop location times out after permission is allowed', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});


test('restores an already granted desktop location without showing the permission gate', async ({ page }) => {
  await installGeolocationMock(page, 'granted');
  const routes = await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await expect.poll(routes.hotTopicRequests).toBeGreaterThan(0);
  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });
  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});

test('hides the permission gate after the user grants location', async ({ page }) => {
  await installGeolocationMock(page, 'prompt');
  await mockCommonRoutes(page);

  await page.goto('/');
  await expect(page.getByTestId('location-gate')).toBeVisible();
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});
