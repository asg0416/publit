import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/functions/v1/get-hot-topics', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
});

test('uses a two-column workspace on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const shell = page.getByTestId('publit-shell');
  const radarPanel = page.getByTestId('radar-panel');
  const summaryPanel = page.getByTestId('summary-panel');

  await expect(shell).toBeVisible();
  await expect(radarPanel).toBeVisible();
  await expect(summaryPanel).toBeVisible();

  const shellBox = await shell.boundingBox();
  const radarBox = await radarPanel.boundingBox();
  const summaryBox = await summaryPanel.boundingBox();

  expect(shellBox?.width).toBeGreaterThan(900);
  expect(summaryBox?.x).toBeGreaterThan((radarBox?.x ?? 0) + (radarBox?.width ?? 0) - 24);
  expect(summaryBox?.width).toBeGreaterThan(280);

  await page.getByRole('button', { name: '내 불꽃 띄우기' }).click();
  const sheetPanel = page.getByTestId('bottom-sheet-panel');
  await expect(sheetPanel).toBeVisible();

  const sheetBox = await sheetPanel.boundingBox();
  expect(sheetBox?.width).toBeLessThanOrEqual(560);
  expect(sheetBox?.x).toBeGreaterThan(300);
});

test('stacks radar and actions cleanly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const shell = page.getByTestId('publit-shell');
  const radarPanel = page.getByTestId('radar-panel');
  const summaryPanel = page.getByTestId('summary-panel');

  await expect(shell).toBeVisible();
  await expect(radarPanel).toBeVisible();
  await expect(summaryPanel).toBeVisible();

  const shellBox = await shell.boundingBox();
  const radarBox = await radarPanel.boundingBox();
  const summaryBox = await summaryPanel.boundingBox();

  expect(shellBox?.width).toBeLessThanOrEqual(390);
  expect(summaryBox?.y).toBeGreaterThan((radarBox?.y ?? 0) + (radarBox?.height ?? 0) - 8);
  expect(summaryBox?.x).toBeLessThan(40);

  await page.getByRole('button', { name: '내 불꽃 띄우기' }).click();
  const sheetBox = await page.getByTestId('bottom-sheet-panel').boundingBox();
  expect(sheetBox?.width).toBeGreaterThan(340);
  expect(sheetBox?.x).toBeLessThan(8);
});
