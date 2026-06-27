import { expect, test } from '@playwright/test';

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

async function readGeolocationCalls(page: import('@playwright/test').Page): Promise<GeolocationCalls> {
  return page.evaluate(() => (
    window as unknown as { __publitGeolocationCalls: GeolocationCalls }
  ).__publitGeolocationCalls);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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

    Object.defineProperty(window, '__publitGeolocationCalls', {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          calls.getCurrentPositionCalls += 1;
          window.setTimeout(() => success(position as GeolocationPosition), 0);
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
  });
});

test('requests browser location only after an explicit user action', async ({ page }) => {
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

  await page.goto('/');
  await expect(page.getByRole('button', { name: /위치 허용/ })).toBeVisible();
  await expect.poll(() => hotTopicRequests).toBeGreaterThan(0);

  await expect.poll(async () => readGeolocationCalls(page)).toEqual({
    getCurrentPositionCalls: 0,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });

  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
  });
  await expect(page.getByText('근처 불꽃이 레이더에 떠 있어요.')).toBeVisible();
});
