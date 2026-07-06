import { expect, test } from '@playwright/test';

const now = new Date('2026-07-06T00:00:00.000Z').toISOString();
const ownedFlame = {
  id: 'owned-flame',
  text: '여기서 다들 같은 생각 하는지 궁금해요.',
  tagLabel: '#지금생각',
  tagNormalized: '지금생각',
  category: 'daily',
  mood: 'curious',
  selfStrength: 2,
  heatLabel: '반응이 생기고 있어요',
  lifecycle: 'live',
  characterKey: 'chick',
  displayScope: 'nearby',
  regionLabel: '근처',
  regionCode: 'nearby',
  createdAt: now,
  liveUntil: '2026-07-07T00:00:00.000Z',
  expiresAt: '2026-07-07T00:00:00.000Z',
  extensionCount: 0,
  ownedByDevice: true,
  reactions: [
    { type: 'similar', label: '어 나도', count: 1, reacted: false },
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
    await route.fulfill({ status: 200, json: [{ displayLabel: '#지금생각', normalizedKey: '지금생각', category: 'daily', scope: 'local', heatLabel: '반응이 생기고 있어요' }] });
  });
  await page.route('**/functions/v1/nearby-flames', async (route) => {
    await route.fulfill({ status: 200, json: [ownedFlame] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 1, limit: 3, isFull: false, activeFlames: [{ id: ownedFlame.id, tagLabel: ownedFlame.tagLabel, status: 'live', createdAt: now }] } });
  });
  await page.route('**/functions/v1/get-comments', async (route) => {
    await route.fulfill({ status: 200, json: [{ id: 'comment-a', body: '나도 이 생각 했어', createdAt: now }] });
  });
  await page.route('**/functions/v1/create-comment', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.body).toBe('익명 댓글 테스트');
    await route.fulfill({ status: 201, json: { comment: { id: 'comment-b', body: body.body, createdAt: now } } });
  });
  await page.route('**/functions/v1/extend-flame', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        flame: {
          ...ownedFlame,
          liveUntil: '2026-07-08T00:00:00.000Z',
          expiresAt: '2026-07-08T00:00:00.000Z',
          extensionCount: 1,
          ownedByDevice: true,
        },
      },
    });
  });
});

test('adds anonymous comments and extends an owned thought from the detail sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();
  await page.getByTestId('thought-character').first().click();

  const dialog = page.getByRole('dialog', { name: '#지금생각' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('나도 이 생각 했어')).toBeVisible();

  await dialog.getByLabel('익명 댓글').fill('익명 댓글 테스트');
  await dialog.getByRole('button', { name: '남기기' }).click();
  await expect(dialog.getByText('익명 댓글 테스트')).toBeVisible();

  await dialog.getByRole('button', { name: '하루 연장' }).click();
  await expect(dialog.getByText(/7월 8일|7\. 8\./)).toBeVisible();
});
