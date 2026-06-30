import { expect, test } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();

const otherDeviceFlame = {
  id: 'flame-from-mobile',
  text: '모바일에서 띄운 생각이에요.',
  tagLabel: '#지금생각',
  tagNormalized: '지금생각',
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
};

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
});

test('refreshes nearby flames from other devices after location is active', async ({ page }) => {
  await page.clock.install({ time: new Date(now) });
  let nearbyRequests = 0;

  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    nearbyRequests += 1;
    await route.fulfill({ status: 200, json: nearbyRequests === 1 ? [] : [otherDeviceFlame] });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('아직 이 공간에 떠 있는 생각이 없어요.').first()).toBeVisible();
  await expect.poll(() => nearbyRequests).toBe(1);

  await page.clock.runFor(12_000);

  await expect.poll(() => nearbyRequests).toBeGreaterThan(1);
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
  await page.getByTestId('thought-character').click();
  await expect(page.getByText('모바일에서 띄운 생각이에요.')).toBeVisible();
});
