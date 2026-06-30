import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/functions/v1/suggest-tags', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
});

test('shows inline guidance instead of silently failing when location is missing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('inline-thought-composer')).toBeVisible();
  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('위치 없이 생성해보는 생각이에요.');
  await page.getByLabel('생각 태그').fill('#테스트');
  await page.getByRole('button', { name: '생각 띄우기', exact: true }).click();

  await expect(page.getByTestId('inline-thought-composer')).toContainText('위치 권한을 먼저 허용하면 생각을 띄울 수 있어요.');
});

test('keeps create enabled with a safe default tag when suggestions are unavailable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('inline-thought-composer')).toBeVisible();
  await page.getByRole('textbox', { name: '지금 떠오른 생각' }).fill('그냥 남겨보는 짧은 생각');

  await expect(page.getByLabel('생각 태그')).toHaveValue('#지금생각');
  await expect(page.getByRole('button', { name: '생각 띄우기', exact: true })).toBeEnabled();
});
