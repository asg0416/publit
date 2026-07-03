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

const quickPositionOptions = { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 };
const watchPositionOptions = { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 };

type GeolocationCalls = {
  getCurrentPositionCalls: number;
  watchPositionCalls: number;
  clearWatchCalls: number;
  getCurrentPositionOptions: Array<PositionOptions | undefined>;
  watchPositionOptions: Array<PositionOptions | undefined>;
};

async function mockCommonRoutes(page: Page) {
  let hotTopicRequests = 0;
  const nearbyRequestBodies: Array<{ lat?: number; lng?: number }> = [];

  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    hotTopicRequests += 1;
    await route.fulfill({ status: 200, json: hotTopics });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    nearbyRequestBodies.push(route.request().postDataJSON() as { lat?: number; lng?: number });
    await route.fulfill({ status: 200, json: nearbyFlames });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });

  return {
    hotTopicRequests: () => hotTopicRequests,
    nearbyRequestBodies: () => nearbyRequestBodies,
  };
}

async function installGeolocationMock(page: Page, mode: 'granted' | 'prompt' | 'get-only' | 'hang' | 'unavailable' | 'unavailable-then-watch' | 'timeout-then-background-success' | 'timeout-then-watch' | 'timeout-then-watch-error-then-success' | 'timeout-then-slow-watch' = 'prompt') {
  await page.addInitScript((selectedMode) => {
    const calls = {
      getCurrentPositionCalls: 0,
      watchPositionCalls: 0,
      clearWatchCalls: 0,
      getCurrentPositionOptions: [] as Array<PositionOptions | undefined>,
      watchPositionOptions: [] as Array<PositionOptions | undefined>,
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
    const geolocationMock = {
      getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) {
        calls.getCurrentPositionCalls += 1;
        calls.getCurrentPositionOptions.push(options);
        if (selectedMode === 'hang') return;
        window.setTimeout(() => {
          if (selectedMode === 'unavailable' || selectedMode === 'unavailable-then-watch') error?.(unavailableError as GeolocationPositionError);
          else if (selectedMode === 'timeout-then-background-success' && calls.getCurrentPositionCalls === 1) error?.(timeoutError as GeolocationPositionError);
          else if (selectedMode === 'timeout-then-watch' || selectedMode === 'timeout-then-watch-error-then-success' || selectedMode === 'timeout-then-slow-watch') error?.(timeoutError as GeolocationPositionError);
          else success(position as GeolocationPosition);
        }, selectedMode === 'timeout-then-background-success' && calls.getCurrentPositionCalls === 2 ? 100 : 0);
      },
      ...(selectedMode === 'get-only' ? {} : {
        watchPosition(success: PositionCallback, error?: PositionErrorCallback, options?: PositionOptions) {
          calls.watchPositionCalls += 1;
          calls.watchPositionOptions.push(options);
          const watchId = calls.watchPositionCalls;
          if (selectedMode === 'hang') return watchId;
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
      }),
    };

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: geolocationMock,
    });
  }, mode);
}

async function readGeolocationCalls(page: Page): Promise<GeolocationCalls> {
  return page.evaluate(() => (
    window as unknown as { __publitGeolocationCalls: GeolocationCalls }
  ).__publitGeolocationCalls);
}

test('starts browser location probes only after an explicit user action', async ({ page }) => {
  await installGeolocationMock(page, 'prompt');
  const routes = await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /위치 허용/ })).toBeVisible();
  await expect.poll(routes.hotTopicRequests).toBeGreaterThan(0);

  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 0,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });

  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    getCurrentPositionOptions: [quickPositionOptions],
    watchPositionOptions: [watchPositionOptions],
  });
  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});

test('does not get stuck on desktop position lookup failures after the user allows location', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('위치 권한을 먼저 허용하면 생각을 띄울 수 있어요.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '조용히 둘러보기' })).toHaveCount(0);
  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });

  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    getCurrentPositionOptions: [quickPositionOptions],
    watchPositionOptions: [watchPositionOptions],
  });
});

test('uses the map center immediately when desktop geolocation cannot resolve', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable');
  const routes = await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });
  await expect.poll(() => routes.nearbyRequestBodies().length).toBeGreaterThanOrEqual(1);
  const [requestBody] = routes.nearbyRequestBodies();
  expect(requestBody.lat).toBeCloseTo(37.5665, 3);
  expect(requestBody.lng).toBeCloseTo(126.978, 3);
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    getCurrentPositionOptions: [quickPositionOptions],
    watchPositionOptions: [watchPositionOptions],
  });
});

test('uses the immediate watch probe instead of a second one-shot retry after timeout', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-background-success');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?geoDebug=1');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const panel = page.getByTestId('location-debug-panel');
  await expect(panel).toContainText('"lastOutcome": "success"', { timeout: 3_000 });
  await expect(panel).toContainText('"lastSource": "watchPosition"');
  await expect(panel).toContainText('"lastAccuracyMeters": 40');
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    watchPositionOptions: [watchPositionOptions],
  });
});

test('starts a watch immediately so desktop location can resolve before the one-shot timeout path stalls', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?geoDebug=1');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const panel = page.getByTestId('location-debug-panel');
  await expect(panel).toContainText('"lastOutcome": "success"', { timeout: 3_000 });
  await expect(panel).toContainText('"lastSource": "watchPosition"');
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    watchPositionOptions: [watchPositionOptions],
  });
});

test('does not throw when the browser only exposes one-shot geolocation', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await installGeolocationMock(page, 'get-only');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0);
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 0,
    clearWatchCalls: 0,
  });
  expect(pageErrors).toEqual([]);
});

test('uses an IP location fallback when desktop geolocation never returns a native position', async ({ page }) => {
  await installGeolocationMock(page, 'hang');
  const routes = await mockCommonRoutes(page);
  await page.route('**/api/location-fallback', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        source: 'vercel-ip',
        lat: 35.1795,
        lng: 129.0756,
        accuracyMeters: 25000,
        city: '부산',
        country: 'KR',
      },
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?geoDebug=1');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 3_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 3_000 });
  await expect.poll(() => routes.nearbyRequestBodies().length).toBeGreaterThanOrEqual(1);
  const [requestBody] = routes.nearbyRequestBodies();
  expect(requestBody.lat).toBeCloseTo(35.1795, 3);
  expect(requestBody.lng).toBeCloseTo(129.0756, 3);
  await expect(page.getByTestId('location-debug-panel')).toContainText('"fallbackLastOutcome": "success"');
  await expect(page.getByTestId('location-debug-panel')).toContainText('"lastSource": "ipFallback"');
});

test('shows desktop geolocation diagnostics when geoDebug is enabled', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?geoDebug=1');
  const panel = page.getByTestId('location-debug-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('"secureContext"');
  await expect(panel).toContainText('"permissionState": "prompt"');

  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(panel).toContainText('"lastOutcome": "error"');
  await expect(panel).toContainText('"lastErrorCode": 2');
  await expect(panel).toContainText('"lastErrorName": "POSITION_UNAVAILABLE"');
  await expect(panel).toContainText('Position unavailable on desktop');
});

test('recovers with watchPosition when the first allowed lookup is temporarily unavailable', async ({ page }) => {
  await installGeolocationMock(page, 'unavailable-then-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
    watchPositionOptions: [watchPositionOptions],
  });
});

test('does not wait for a slower desktop watch before using the map center', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-slow-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('위치 확인 시간이 초과됐어요.')).toHaveCount(0);
  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 0,
  });
});

test('does not delay the map-center fallback for transient desktop watch patterns', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-watch-error-then-success');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('위치 확인 시간이 초과됐어요.')).toHaveCount(0);
  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
  });
});

test('uses the map center when desktop location times out after permission is allowed', async ({ page }) => {
  await installGeolocationMock(page, 'timeout-then-watch');
  await mockCommonRoutes(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('location-gate')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId('thought-character')).toHaveCount(1, { timeout: 2_000 });
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
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
  await expect.poll(async () => readGeolocationCalls(page)).toMatchObject({
    getCurrentPositionCalls: 1,
    watchPositionCalls: 1,
    clearWatchCalls: 1,
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
