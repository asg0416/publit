import { expect, test, type Page } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();

const hotTopics = [
  { displayLabel: '#지금생각', normalizedKey: '지금생각', category: 'daily', scope: 'global', heatLabel: '오늘 많이 켜진 불꽃' },
];

const nearbyFlames = [
  {
    id: 'flame-nearby',
    text: '권한을 누른 뒤에만 보이는 근처 불꽃이에요.',
    tagLabel: '#지금생각',
    tagNormalized: '지금생각',
    category: 'daily',
    mood: 'curious',
    selfStrength: 2,
    heatLabel: '방금 켜진 불꽃',
    lifecycle: 'live',
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

async function installGeolocationMock(page: Page, mode: 'success' | 'unavailable' = 'success') {
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

    Object.defineProperty(window, '__publitGeolocationCalls', {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        async query() {
          return { name: 'geolocation', state: 'granted', onchange: null };
        },
      },
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback) {
          calls.getCurrentPositionCalls += 1;
          window.setTimeout(() => {
            if (selectedMode === 'success') success(position as GeolocationPosition);
            else error?.(unavailableError as GeolocationPositionError);
          }, 0);
        },
        watchPosition(success: PositionCallback) {
          calls.watchPositionCalls += 1;
          const watchId = calls.watchPositionCalls;
          window.setTimeout(() => success(position as GeolocationPosition), 0);
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
  await installGeolocationMock(page);
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
  await expect(page.getByText('근처 불꽃이 레이더에 떠 있어요.')).toBeVisible();
});

test('does not describe desktop position lookup failures as missing permission after the user allows location', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('권한은 요청됐지만 현재 위치를 가져오지 못했어요.')).toBeVisible();
  await expect(page.getByText('위치 권한 없이도 조용히 둘러볼 수 있어요.')).toHaveCount(0);

  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });
});
