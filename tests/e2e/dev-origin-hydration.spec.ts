import { expect, test } from '@playwright/test';

test('keeps buttons interactive when opened through 127.0.0.1 dev origin', async ({ page }) => {
  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });

  await page.goto('http://127.0.0.1:3217/');
  await page.getByRole('button', { name: '조용히 둘러보기' }).click();

  await expect(page.getByTestId('publit-shell')).toBeVisible();
  await expect(page.getByTestId('summary-panel')).toHaveCount(0);
});
