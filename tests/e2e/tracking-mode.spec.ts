import { expect, test, type Page } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();

const nearbyFlames = [
  {
    id: 'tracking-flame',
    text: '움직이면서 보는 생각이에요.',
    tagLabel: '#이동중',
    tagNormalized: '이동중',
    category: 'daily',
    mood: 'curious',
    selfStrength: 2,
    heatLabel: '방금 떠오른 생각',
    lifecycle: 'live',
    characterKey: 'chick',
    displayScope: 'nearby',
    regionLabel: '근처',
    regionCode: 'nearby',
    createdAt: now,
  },
];

async function installMovingGeolocationMock(page: Page) {
  await page.addInitScript(() => {
    let watchSuccess: PositionCallback | null = null;
    const calls = {
      getCurrentPositionCalls: 0,
      watchPositionCalls: 0,
      clearWatchCalls: 0,
    };
    const makePosition = (latitude: number, longitude: number) => ({
      coords: {
        latitude,
        longitude,
        accuracy: 24,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }) as GeolocationPosition;

    Object.defineProperty(window, '__publitTrackingCalls', {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(window, '__publitEmitPosition', {
      configurable: true,
      value: (latitude: number, longitude: number) => {
        watchSuccess?.(makePosition(latitude, longitude));
      },
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        async query() {
          return { name: 'geolocation', state: 'prompt', onchange: null };
        },
      },
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          calls.getCurrentPositionCalls += 1;
          window.setTimeout(() => success(makePosition(35.1795, 129.0756)), 0);
        },
        watchPosition(success: PositionCallback) {
          calls.watchPositionCalls += 1;
          watchSuccess = success;
          window.setTimeout(() => success(makePosition(35.1795, 129.0756)), 0);
          return calls.watchPositionCalls;
        },
        clearWatch() {
          calls.clearWatchCalls += 1;
        },
      },
    });
  });
}

async function mockRoutes(page: Page) {
  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [{ displayLabel: '#이동중', normalizedKey: '이동중', category: 'daily', scope: 'local', heatLabel: '요즘 이 태그가 모여요' }] });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    nearbyRequestBodies.push(route.request().postDataJSON() as NearbyRequestBody);
    await route.fulfill({ status: 200, json: nearbyFlames });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
}

type NearbyRequestBody = {
  rangeValue?: string;
};

let nearbyRequestBodies: NearbyRequestBody[] = [];

async function mapCenter(page: Page) {
  const map = page.getByTestId('mapglot-background');
  return {
    lat: Number(await map.getAttribute('data-map-center-lat')),
    lng: Number(await map.getAttribute('data-map-center-lng')),
  };
}

async function emitPosition(page: Page, lat: number, lng: number) {
  await page.evaluate(([nextLat, nextLng]) => {
    (window as unknown as { __publitEmitPosition: (lat: number, lng: number) => void }).__publitEmitPosition(nextLat, nextLng);
  }, [lat, lng]);
}

test.beforeEach(async ({ page }) => {
  nearbyRequestBodies = [];
  await installMovingGeolocationMock(page);
  await mockRoutes(page);
});

test('tracks live device movement until the user pans, then resumes from the current-location button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('mapglot-background')).toHaveAttribute('data-map-tracking', 'active');
  await expect.poll(async () => (await mapCenter(page)).lat).toBeCloseTo(35.1795, 4);

  await emitPosition(page, 35.1812, 129.0772);
  await expect.poll(async () => (await mapCenter(page)).lat).toBeCloseTo(35.1812, 4);

  const mapBox = await page.getByTestId('mapglot-background').boundingBox();
  expect(mapBox).not.toBeNull();
  await page.mouse.move(mapBox!.x + mapBox!.width / 2, mapBox!.y + mapBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(mapBox!.x + mapBox!.width / 2 + 80, mapBox!.y + mapBox!.height / 2 + 20);
  await page.mouse.up();

  await expect(page.getByTestId('mapglot-background')).toHaveAttribute('data-map-tracking', 'manual');
  const manualCenter = await mapCenter(page);

  await emitPosition(page, 35.185, 129.081);
  await page.waitForTimeout(120);
  expect((await mapCenter(page)).lat).toBeCloseTo(manualCenter.lat, 4);

  await page.getByRole('button', { name: '현재 위치로 이동' }).click();
  await expect(page.getByTestId('mapglot-background')).toHaveAttribute('data-map-tracking', 'active');
  await expect.poll(async () => (await mapCenter(page)).lat).toBeCloseTo(35.185, 4);
});

test('uses map zoom gestures to snap the radius to the nearest range step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  const map = page.getByTestId('mapglot-background');
  await expect(map).toHaveAttribute('data-map-range', '500m');
  await expect.poll(() => nearbyRequestBodies.at(-1)?.rangeValue).toBe('500m');

  await map.dispatchEvent('wheel', { deltaY: -800 });
  await expect(map).toHaveAttribute('data-map-range', '300m');
  await expect(map).toHaveAttribute('data-map-tracking', 'active');
  await expect.poll(() => nearbyRequestBodies.at(-1)?.rangeValue).toBe('300m');

  await map.dispatchEvent('wheel', { deltaY: 800 });
  await expect(map).toHaveAttribute('data-map-range', '500m');
  await expect.poll(() => nearbyRequestBodies.at(-1)?.rangeValue).toBe('500m');
});
