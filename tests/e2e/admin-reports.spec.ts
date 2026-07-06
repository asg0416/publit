import { expect, test } from '@playwright/test';

const report = {
  id: 'report-1',
  flameId: 'flame-reported',
  reason: 'misinformation',
  detail: '내용 확인 필요',
  createdAt: '2026-07-06T01:00:00.000Z',
  thought: {
    id: 'flame-reported',
    text: '신고 처리가 필요한 생각입니다.',
    tagLabel: '#지금생각',
    tagNormalized: '지금생각',
    status: 'reported',
    heatScore: 4,
    createdAt: '2026-07-06T00:30:00.000Z',
  },
};

test('loads the admin report queue and resolves a report with the admin token header', async ({ page }) => {
  const seenHeaders: string[] = [];

  await page.route('**/functions/v1/admin-reports', async (route) => {
    seenHeaders.push(route.request().headers()['x-admin-token'] ?? '');
    await route.fulfill({ status: 200, json: [report] });
  });
  await page.route('**/functions/v1/admin-resolve-report', async (route) => {
    const body = route.request().postDataJSON();
    seenHeaders.push(route.request().headers()['x-admin-token'] ?? '');
    expect(body).toMatchObject({ reportId: 'report-1', action: 'hide' });
    await route.fulfill({ status: 200, json: { ok: true, action: 'hide' } });
  });

  await page.goto('/admin');
  await page.getByLabel('관리자 토큰').fill('secret-admin-token');
  await page.getByRole('button', { name: /새로고침/ }).click();

  await expect(page.getByText('신고 처리가 필요한 생각입니다.')).toBeVisible();
  await expect(page.getByText('내용 확인 필요')).toBeVisible();

  await page.getByRole('button', { name: '숨김' }).click();
  await expect(page.getByText('생각을 숨겼어요.')).toBeVisible();
  expect(seenHeaders).toEqual(['secret-admin-token', 'secret-admin-token']);
});
