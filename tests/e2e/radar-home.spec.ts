import { expect, test } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();

const topics = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'local', heatLabel: '근처에서 자주 보여요' },
  { displayLabel: '#지역교통', normalizedKey: '지역교통', category: 'local', scope: 'local', heatLabel: '요즘 이 태그가 모여요' },
  { displayLabel: '#안전', normalizedKey: '안전', category: 'safety', scope: 'global', heatLabel: '이야기가 모이고 있어요' },
];

const nearbyFlames = [
  {
    id: 'flame-1',
    text: '근처 카페 자리가 조용해서 작업하기 좋아요.',
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
    id: 'flame-2',
    text: '역 앞 신호가 길게 밀려요.',
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
  {
    id: 'flame-3',
    text: '카페 안쪽 콘센트 자리가 비었어요.',
    tagLabel: '#카페대화',
    tagNormalized: '카페대화',
    category: 'daily',
    mood: 'want_talk',
    selfStrength: 3,
    heatLabel: '요즘 이 태그가 모여요',
    lifecycle: 'ember',
    characterKey: 'chick',
    displayScope: 'nearby',
    regionLabel: '근처',
    regionCode: 'nearby',
    createdAt: now,
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
    await route.fulfill({ status: 200, json: nearbyFlames });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/suggest-tags', async (route) => {
    await route.fulfill({ status: 200, json: [{ displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', source: 'remote' }] });
  });
  await page.route('**/functions/v1/create-flame', async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        flame: {
          id: 'flame-created',
          text: '새로 띄운 생각이에요.',
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
        },
        activeFlames: [{ id: 'flame-created', tagLabel: '#카페대화', status: 'live', createdAt: now }],
      },
    });
  });
});

test('renders the map-first Anigeunde home without old map globals', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '아니근데' })).toBeVisible();
  await expect(page.getByText('🤔')).toBeVisible();
  await expect(page.getByText('지금 뜨는 태그')).toBeVisible();
  await expect(page.getByText('지금 나만 이 생각해?')).toBeVisible();
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await expect(page.getByTestId('mapglot-background')).toBeVisible();
  await expect(page.getByTestId('thought-map')).toBeVisible();
  await expect(page.getByTestId('thought-character')).toHaveCount(3);
  await expect(page.getByTestId('flame-glyph')).toHaveCount(3);
  await expect(page.getByTestId('summary-panel')).toHaveCount(0);
  await expect(page.getByTestId('range-control')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '반경 설정' })).toBeVisible();
  await page.getByRole('button', { name: '반경 설정' }).click();
  await expect(page.getByRole('button', { name: '50m' })).toBeVisible();
  await expect(page.getByRole('button', { name: '500m' })).toBeVisible();
  await expect(page.getByRole('button', { name: '전국' })).toBeVisible();
  await expect(page.getByRole('button', { name: '생각 띄우기' })).toBeVisible();

  await expect.poll(async () => page.evaluate(() => ({
    googleMaps: Boolean((window as unknown as { google?: { maps?: unknown } }).google?.maps),
    mapbox: Boolean((window as unknown as { mapboxgl?: unknown }).mapboxgl),
    leaflet: Boolean((window as unknown as { L?: unknown }).L),
  }))).toEqual({ googleMaps: false, mapbox: false, leaflet: false });
});

test('creates a flame through the sheet using mocked edge functions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await page.getByRole('button', { name: '생각 띄우기' }).click();
  await expect(page.getByRole('dialog', { name: '생각 띄우기' })).toBeVisible();
  await expect(page.getByText('생각 분위기')).toBeVisible();
  await expect(page.getByText('생각 크기')).toBeVisible();
  await expect(page.getByText('캐릭터')).toBeVisible();
  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('새로 띄운 생각이에요.');
  await page.getByLabel('생각 태그').fill('#카페대화');
  await page.getByRole('button', { name: '생각 띄우기', exact: true }).click();

  await expect(page.getByTestId('thought-character')).toHaveCount(4);
});
