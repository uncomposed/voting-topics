import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Create a priority profile' }).click();
});

test('category cards save selections immediately and export exactly what is checked', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Category card', exact: true })).toHaveValue('Economy & Work');
  await expect(page.getByLabel('Priority menu results').getByRole('checkbox')).toHaveCount(3);

  const economy = 'People who work full time can afford a stable standard of living';
  await page.getByRole('checkbox', { name: new RegExp(economy, 'u') }).check();
  await expect(page.getByText('1 selected outcomes; 1 Unrated.')).toBeVisible();

  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByRole('combobox', { name: 'Category card', exact: true })).toHaveValue('Taxes');
  await expect(page.getByText('Category 2 of 22')).toBeVisible();
  const taxes = 'The tax burden is understandable and predictable';
  await page.getByRole('checkbox', { name: new RegExp(taxes, 'u') }).check();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export profile JSON' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const exported = JSON.parse(await readFile(path!, 'utf8')) as { version: string; topics: Array<{ title: string; stars: number | null }> };
  expect(exported.version).toBe('vt.topic-profile.v3');
  expect(exported.topics.map((topic) => topic.title)).toEqual([economy, taxes]);
  expect(exported.topics.map((topic) => topic.stars)).toEqual([null, null]);
});

test('rating keeps card position stable, explicit sorting is a snapshot, and the next step is reachable', async ({ page }) => {
  const economy = 'People who work full time can afford a stable standard of living';
  const taxes = 'The tax burden is understandable and predictable';
  await page.getByRole('checkbox', { name: new RegExp(economy, 'u') }).check();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('checkbox', { name: new RegExp(taxes, 'u') }).check();

  const cards = page.locator('.topic-card');
  await cards.filter({ hasText: economy }).getByRole('button', { name: '1 stars' }).click();
  await cards.filter({ hasText: taxes }).getByRole('button', { name: '5 stars' }).click();
  await expect(cards.nth(0)).toContainText(economy);

  await page.getByRole('button', { name: 'Sort by rating now' }).click();
  await expect(cards.nth(0)).toContainText(taxes);
  await cards.nth(0).getByRole('button', { name: '0 stars' }).click();
  await expect(cards.nth(0)).toContainText(taxes);
  await expect(page.getByText(/This order is now fixed/u)).toBeVisible();

  await page.getByRole('button', { name: 'Create election and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Define the ballot voters will see' })).toBeVisible();
});
