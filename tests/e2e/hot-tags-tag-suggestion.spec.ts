import { expect, test } from '@playwright/test';

const topics = Array.from({ length: 10 }, (_, index) => ({
  displayLabel: ['#투표용지이슈', '#청년정책', '#지역교통', '#카페대화', '#안전', '#부산', '#정치대화', '#지역이슈', '#자료확인', '#동네소식'][index],
  normalizedKey: ['투표용지이슈', '청년정책', '지역교통', '카페대화', '안전', '부산', '정치대화', '지역이슈', '자료확인', '동네소식'][index],
  category: index === 0 || index === 6 || index === 8 ? 'politics' : index === 4 ? 'safety' : index === 3 ? 'daily' : 'local',
  scope: index < 5 ? 'local' : 'global',
  heatLabel: index < 5 ? '근처에서 켜지고 있어요' : '오늘 많이 켜진 불꽃',
}));

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
    await route.fulfill({ status: 200, json: [{ displayLabel: '#투표용지이슈', normalizedKey: '투표용지이슈', category: 'politics', source: 'remote' }] });
  });
});

test('expands hot tags, accepts suggested tags, and blocks unsafe text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /위치 허용/ }).click();
  await page.getByRole('button', { name: '내 불꽃 띄우기' }).click();

  await page.getByRole('button', { name: /지금 뜨거운 불꽃/ }).click();
  await expect(page.getByText('1. #투표용지이슈')).toBeVisible();
  await expect(page.getByText(/사용\s*수|조회수|반응\s*\d+개/)).toHaveCount(0);

  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('카페에서 투표 이야기를 들었어요.');
  await expect(page.locator('button', { hasText: '#투표용지이슈' }).last()).toBeVisible();
  await page.locator('button', { hasText: '#투표용지이슈' }).last().click();
  await expect(page.getByLabel('불꽃 태그')).toHaveValue('#투표용지이슈');

  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('전화번호 공개하자');
  await expect(page.getByText('위험하거나 사생활을 침해할 수 있는 문구는 불꽃으로 띄울 수 없어요.')).toBeVisible();
});
