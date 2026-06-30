import { expect, test } from '@playwright/test';

const now = new Date('2026-06-28T00:00:00.000Z').toISOString();
const topics = [
  { displayLabel: '#카페대화', normalizedKey: '카페대화', category: 'daily', scope: 'local', heatLabel: '근처에서 자주 보여요' },
];
const flame = {
  id: 'flame-detail',
  text: '근처 카페 자리가 조용해서 작업하기 좋아요.',
  tagLabel: '#카페대화',
  tagNormalized: '카페대화',
  category: 'daily',
  mood: 'curious',
  selfStrength: 2,
  heatLabel: '방금 켜진 불꽃',
  lifecycle: 'live',
  characterKey: 'turtle',
  displayScope: 'nearby',
  regionLabel: '근처',
  regionCode: 'nearby',
  createdAt: now,
};
const nextFlame = {
  id: 'flame-detail-next',
  text: '버스 정류장 앞 신호가 오늘 유난히 길어요.',
  tagLabel: '#지역교통',
  tagNormalized: '지역교통',
  category: 'local',
  mood: 'quiet',
  selfStrength: 3,
  heatLabel: '이야기가 모이고 있어요',
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
    await route.fulfill({ status: 200, json: [flame, nextFlame] });
  });
  await page.route('**/functions/v1/my-flames', async (route) => {
    await route.fulfill({ status: 200, json: { used: 0, limit: 3, isFull: false, activeFlames: [] } });
  });
  await page.route('**/functions/v1/react-flame', async (route) => {
    await route.fulfill({ status: 200, json: { heatLabel: '요즘 이 태그가 모여요' } });
  });
  await page.route('**/functions/v1/report-flame', async (route) => {
    await route.fulfill({ status: 200, json: { ok: true, status: 'hidden' } });
  });
});

test('opens details, reacts without counts, and removes a hidden report', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();

  await page.getByTestId('thought-character').first().click();
  await expect(page.getByRole('dialog', { name: '#카페대화' })).toBeVisible();
  const panel = page.getByTestId('bottom-sheet-panel');
  await expect(panel.getByText('#카페대화')).toHaveCount(1);
  await expect(panel.getByTestId('thought-speech-bubble')).toContainText('🐢');
  await expect(panel.getByTestId('thought-speech-bubble')).toContainText('근처 카페 자리가 조용해서 작업하기 좋아요.');
  await expect(panel.getByText('불꽃')).toHaveCount(0);
  await expect(page.getByText(/반응 \d+개|\d+명|조회수/)).toHaveCount(0);

  await panel.getByTestId('thought-detail-swipe-area').dispatchEvent('touchstart', {
    touches: [{ identifier: 1, target: await panel.getByTestId('thought-detail-swipe-area').elementHandle(), clientX: 320, clientY: 520 }],
  });
  await panel.getByTestId('thought-detail-swipe-area').dispatchEvent('touchend', {
    changedTouches: [{ identifier: 1, target: await panel.getByTestId('thought-detail-swipe-area').elementHandle(), clientX: 80, clientY: 520 }],
  });
  await expect(page.getByRole('dialog', { name: '#지역교통' })).toBeVisible();
  await expect(panel.getByTestId('thought-speech-bubble')).toHaveClass(/anigeunde-swipe-card-forward/);
  await expect(panel.getByTestId('thought-speech-bubble')).toContainText('🐥');
  await expect(panel.getByTestId('thought-speech-bubble')).toContainText('버스 정류장 앞 신호가 오늘 유난히 길어요.');

  await page.getByRole('button', { name: '궁금해요' }).click();
  await expect(page.getByText('요즘 이 태그가 모여요')).toBeVisible();

  await page.getByRole('button', { name: '신고' }).click();
  await page.getByRole('button', { name: '오정보' }).click();
  await expect(page.getByTestId('thought-character')).toHaveCount(1);
});
