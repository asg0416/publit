import { expect, test } from '@playwright/test';

const topics = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'global', heatLabel: '요즘 이 태그가 모여요' },
  { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', scope: 'local', heatLabel: '근처에서 자주 보여요' },
];

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
        watchPosition(success: PositionCallback) {
          window.setTimeout(() => success(position as GeolocationPosition), 0);
          return 1;
        },
        clearWatch() {},
      },
    });
  });

  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: topics });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/suggest-tags', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
});

test('shows an inviting empty map without exposing exact coordinates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('아직 이 공간에 떠 있는 생각이 없어요.').first()).toBeVisible();
  await expect(page.getByText('첫 생각을 띄워볼까요?')).toBeVisible();
  await expect(page.getByRole('button', { name: '생각 띄우기' })).toBeVisible();
  await expect(page.getByText('#카페대화').first()).toBeVisible();
  await expect(page.getByText(/35\.1795|129\.0756|latitude|longitude|coordinates/i)).toHaveCount(0);
});
