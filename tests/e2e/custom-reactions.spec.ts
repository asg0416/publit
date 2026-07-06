import { expect, test } from '@playwright/test';

const now = new Date('2026-07-06T00:00:00.000Z').toISOString();
const flame = {
  id: 'custom-reaction-flame',
  text: '여기 버튼 직접 만들 수 있으면 재밌겠다.',
  tagLabel: '#지금생각',
  tagNormalized: '지금생각',
  category: 'daily',
  mood: 'curious',
  selfStrength: 2,
  heatLabel: '방금 떠오른 생각',
  lifecycle: 'live',
  characterKey: 'turtle',
  displayScope: 'nearby',
  regionLabel: '근처',
  regionCode: 'nearby',
  createdAt: now,
  reactions: [
    { type: 'similar', label: '어 나도', count: 0, reacted: false },
    { type: 'curious', label: '궁금', count: 0, reacted: false },
    { type: 'neutral', label: '중립', count: 0, reacted: false },
    { type: 'disagree', label: '별로', count: 0, reacted: false },
    { type: 'watching', label: '관망 중', count: 0, reacted: false },
  ],
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
    await route.fulfill({ status: 200, json: [{ displayLabel: '#지금생각', normalizedKey: '지금생각', category: 'daily', scope: 'local', heatLabel: '방금 떠오른 생각' }] });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: [flame] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/get-comments', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/react-flame', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ flameId: flame.id, reactionType: 'custom', reactionLabel: '완전 공감' });
    await route.fulfill({
      status: 200,
      json: {
        heatLabel: '반응이 생기고 있어요',
        reactions: [
          ...flame.reactions,
          { type: 'custom', label: '완전 공감', count: 1, reacted: true, custom: true },
        ],
      },
    });
  });
});

test('lets a viewer create and press a custom reaction button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();
  await page.getByTestId('thought-character').first().click();

  const dialog = page.getByRole('dialog', { name: '#지금생각' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '반응 추가' }).click();
  await dialog.getByLabel('직접 반응').fill('완전 공감');
  await dialog.getByRole('button', { name: '추가' }).click();

  await expect(dialog.getByRole('button', { name: /완전 공감\s+1/ })).toHaveAttribute('aria-pressed', 'true');
});
