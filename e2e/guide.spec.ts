import { expect, test } from '@playwright/test';
import { completeDemoGuide } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('creator completes, shares, reopens, copies, and reloads a five-contest guide', async ({ page }) => {
  await completeDemoGuide(page);
  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await exportPromise).suggestedFilename()).toMatch(/\.json$/u);
  await page.getByRole('button', { name: 'Copy private review link' }).click();
  const reviewUrl = await page.getByLabel('Review link').inputValue();
  expect(reviewUrl).toContain('#guide=g1.');
  expect(reviewUrl.length).toBeLessThan(4000);

  await page.goto(reviewUrl);
  await expect(page.getByText('Read-only shared guide')).toBeVisible();
  await expect(page.getByTestId('review-library-levy').getByText('No', { exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Make my copy' }).click();
  await expect(page.getByLabel('Guide title')).toHaveValue(/my copy$/i);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved guide' }).click();
  await expect(page.getByLabel('Guide title')).toHaveValue(/my copy$/i);
});

test('malformed shared data never replaces a local draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start fictional demo' }).click();
  await page.getByLabel('Guide title').fill('Do not overwrite me');
  await page.getByRole('button', { name: 'Trusted Voter Guide home' }).click();
  await page.getByLabel('Voter guide file').setInputFiles({
    name: 'damaged.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ definitely not JSON'),
  });
  await expect(page.getByRole('alert')).toContainText('Could not import that guide');
  await page.getByRole('button', { name: 'Resume saved guide' }).click();
  await expect(page.getByLabel('Guide title')).toHaveValue('Do not overwrite me');
  await page.goto('/#guide=g1.damaged');
  await expect(page.getByRole('alert')).toContainText('saved guide was not changed');
  await page.getByRole('button', { name: 'Resume saved guide' }).click();
  await expect(page.getByLabel('Guide title')).toHaveValue('Do not overwrite me');
});

test('legacy data can be downloaded without migration', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('vt.m2', '{"legacy":"untouched"}'));
  await page.reload();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download legacy backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('voting-topics-legacy-vt-m2-backup.json');
  expect(await page.evaluate(() => localStorage.getItem('vt.m2'))).toBe('{"legacy":"untouched"}');
});
