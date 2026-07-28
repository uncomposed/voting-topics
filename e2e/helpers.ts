import { expect, type Page } from '@playwright/test';

export async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fictional demonstration' }).click();
  await expect(page.getByRole('heading', { name: 'What outcomes matter to you?' })).toBeVisible();
}

export async function openReviewedDemo(page: Page) {
  await startDemo(page);
  await page.getByRole('button', { name: '4 Draft & review' }).click();
  await expect(page.getByRole('heading', { name: 'Your explainable draft ballot' })).toBeVisible();
  const confirmations = page.getByLabel(/I reviewed the evidence/u);
  await expect(confirmations).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await confirmations.nth(index).check();
  await page.getByRole('button', { name: '5 Share' }).click();
  await expect(page.getByRole('button', { name: 'Create share snapshot' })).toBeEnabled();
}
