import { expect, test } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();
const topics = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'local', heatLabel: '근처에서 켜지고 있어요' },
];
const flame = {
  id: 'flame-detail',
  text: '근처 카페 자리가 조용해서 작업하기 좋아요.',
  tagLabel: '#카페대화',
  tagNormalized: '카페대화',
  category: 'daily',
  mood: 'curious',
  selfStrength: 2,
  heatLabel: '반응이 생기고 있어요',
  lifecycle: 'live',
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
    await route.fulfill({ status: 200, json: [flame] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/react-flame', async (route) => {
    await route.fulfill({ status: 200, json: { heatLabel: '이 불꽃이 조금 커지고 있어요' } });
  });
  await page.route('**/functions/v1/report-flame', async (route) => {
    await route.fulfill({ status: 200, json: { ok: true, status: 'hidden' } });
  });
});

test('opens details, reacts without counts, and removes a hidden report', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await page.getByTestId('flame-particle').first().click();
  await expect(page.getByRole('dialog', { name: '#카페대화' })).toBeVisible();
  await expect(page.getByText('근처 카페 자리가 조용해서 작업하기 좋아요.')).toBeVisible();
  await expect(page.getByText(/반응 \d+개|\d+명|조회수/)).toHaveCount(0);

  await page.getByRole('button', { name: '궁금해요' }).click();
  await expect(page.getByText('이 불꽃이 조금 커지고 있어요')).toBeVisible();

  await page.getByRole('button', { name: '신고' }).click();
  await page.getByRole('button', { name: '오정보' }).click();
  await expect(page.getByText('신고를 접수했어요.')).toBeVisible();
  await expect(page.getByTestId('flame-particle')).toHaveCount(0);
});
