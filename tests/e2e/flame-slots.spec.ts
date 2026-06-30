import { expect, test } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();
const fullSlots = [
  { id: 'mine-1', tagLabel: '#카페대화', status: 'live', createdAt: now },
  { id: 'mine-2', tagLabel: '#지역교통', status: 'live', createdAt: now },
  { id: 'mine-3', tagLabel: '#안전', status: 'live', createdAt: now },
];

test.beforeEach(async ({ page }) => {
  let activeFlames = [...fullSlots];

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
    await route.fulfill({ status: 200, json: [{ displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'global', heatLabel: '요즘 이 태그가 모여요' }] });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: activeFlames.length, limit: 3, isFull: activeFlames.length >= 3, activeFlames } });
  });
  await page.route('**/functions/v1/suggest-tags', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/extinguish-flame', async (route) => {
    activeFlames = activeFlames.slice(1);
    await route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.route('**/functions/v1/create-flame', async (route) => {
    if (activeFlames.length >= 3) {
      await route.fulfill({ status: 409, json: { error: { code: 'FLAME_SLOT_FULL' }, activeFlames } });
      return;
    }

    const created = {
      id: 'created-after-extinguish',
      text: '빈 슬롯에 새 생각을 띄웠어요.',
      tagLabel: '#카페대화',
      tagNormalized: '카페대화',
      category: 'daily',
      mood: 'curious',
      selfStrength: 2,
      heatLabel: '방금 떠오른 생각',
      lifecycle: 'live',
      characterKey: 'dog',
      displayScope: 'nearby',
      regionLabel: '근처',
      regionCode: 'nearby',
      createdAt: now,
    };
    activeFlames = [{ id: created.id, tagLabel: created.tagLabel, status: 'live', createdAt: now }, ...activeFlames];
    await route.fulfill({ status: 201, json: { flame: created, activeFlames } });
  });
});

test('shows full live slots, lets the user extinguish one, then creates again', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByText('3 / 3')).toBeVisible();
  await expect(page.getByText('내 생각 슬롯이 모두 차 있어요. 새 생각을 띄우려면 기존 생각 하나를 내려주세요.')).toBeVisible();

  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('빈 슬롯을 확인하는 생각이에요.');
  await page.getByLabel('생각 태그').fill('#카페대화');
  await page.getByRole('button', { name: '생각 띄우기', exact: true }).click();
  await expect(page.getByTestId('inline-thought-composer').getByText('내 생각 슬롯이 모두 차 있어요.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '내리기' }).first().click();
  await expect(page.getByText('내 생각 슬롯이 모두 차 있어요. 새 생각을 띄우려면 기존 생각 하나를 내려주세요.')).toHaveCount(0);

  await page.getByRole('button', { name: '생각 띄우기', exact: true }).click();
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});
