import { expect, test } from '@playwright/test';
import { openReviewedDemo, startDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('activated friend shares; peer inspects, forks, changes, diffs, reshares, and reopens', async ({ page }) => {
  await openReviewedDemo(page);
  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await exportPromise).suggestedFilename()).toBe('peer-sample-ballot.json');
  await page.getByRole('button', { name: 'Create share snapshot' }).click();
  const parentUrl = await page.getByLabel('Self-contained review link').inputValue();
  expect(parentUrl).toContain('#guide=p1.');
  expect(parentUrl.length).toBeLessThan(4000);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } });
  });
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('status')).toContainText('Select and copy the link');
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printed = 'yes'; }; });
  await page.getByRole('button', { name: 'Print / save PDF' }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.printed)).toBe('yes');

  await page.goto(parentUrl);
  await expect(page.getByText('Immutable peer snapshot · read only')).toBeVisible();
  await expect(page.getByText('Avery Stone × More residents can afford stable housing near jobs and services')).toBeHidden();
  await page.getByRole('button', { name: 'Make my copy' }).click();
  await expect(page.getByRole('heading', { name: 'Your topic profile' })).toBeVisible();

  const housingCard = page.locator('.topic-card').filter({ hasText: 'More residents can afford stable housing near jobs and services' });
  await housingCard.getByRole('button', { name: '1 stars' }).click();
  await page.getByRole('button', { name: '4 Draft & share' }).click();
  await expect(page.getByText(/5 → 1 stars/u)).toBeVisible();
  await expect(page.getByText('Scores changed: mayor')).toBeVisible();
  await expect(page.getByText('Scores changed: council')).toHaveCount(0);

  const confirmations = page.getByLabel(/I reviewed the generated evidence/u);
  for (let index = 0; index < 5; index += 1) await confirmations.nth(index).check();
  await page.getByRole('button', { name: 'Create share snapshot' }).click();
  const childUrl = await page.getByLabel('Self-contained review link').inputValue();
  await page.goto(childUrl);
  await expect(page.getByText(/Forked from/u)).toBeVisible();
  await expect(page.getByText(/5 → 1 stars/u)).toBeVisible();
});

test('manual election builder and complete sparse mapping remain directly editable', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await startDemo(page);
  await page.getByRole('button', { name: '2 Election' }).click();
  await expect(page.getByLabel('Voting method').first()).toHaveValue('fptp');
  await expect(page.getByLabel('Voting method').nth(2)).toHaveValue('rcv');
  await expect(page.getByLabel('Voting method').nth(3)).toHaveValue('star');
  await page.getByRole('button', { name: '3 Map' }).click();
  await expect(page.getByRole('heading', { name: 'Map options to relevant topics' })).toBeVisible();
  await expect(page.locator('.mapping-cell')).toHaveCount(6);
  await expect(page.locator('.mapping-cell.missing')).toHaveCount(0);
  await page.getByRole('button', { name: 'County Council — choose up to two' }).click();
  await expect(page.locator('.mapping-cell')).toHaveCount(6);
});

test('malformed link and JSON import preserve local work', async ({ page }) => {
  await startDemo(page);
  const stored = await page.evaluate(() => localStorage.getItem('vt.election-workspaces.v1'));
  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByLabel('Choose peer-guide JSON').setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from('{not JSON') });
  await expect(page.getByRole('alert')).toContainText('Local work was not changed');
  expect(await page.evaluate(() => localStorage.getItem('vt.election-workspaces.v1'))).toBe(stored);
  await page.goto('/#guide=p1.damaged');
  await expect(page.getByRole('alert')).toContainText('Local work was not changed');
  expect(await page.evaluate(() => localStorage.getItem('vt.election-workspaces.v1'))).toBe(stored);
});

test('legacy vt.m2 can be previewed, cancelled, and downloaded byte for byte', async ({ page }) => {
  const raw = JSON.stringify({ state: { version: 'tsb.v2', title: 'Old topics', topics: [{ id: 'category', title: 'Housing', importance: 2 }], items: [{ id: 'item', text: 'More people can afford stable homes', stars: 5, topicIds: ['category'], sources: [] }] } });
  await page.evaluate((value) => localStorage.setItem('vt.m2', value), raw);
  await page.reload();
  await page.getByRole('button', { name: 'Preview conversion' }).click();
  await expect(page.getByText(/tsb.v2 → vt.topic-profile.v1/u)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download exact raw data' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('vt-m2-exact-backup.json');
  expect(await page.evaluate(() => localStorage.getItem('vt.m2'))).toBe(raw);
});
