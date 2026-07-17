import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openReviewedDemo, startDemo } from './helpers';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('home, profile, election, mapping, and review pass serious/critical Axe checks', async ({ page }) => {
  await expectNoSeriousViolations(page);
  await startDemo(page);
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: '2 Election' }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: '3 Map' }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: '4 Draft & share' }).click();
  await expectNoSeriousViolations(page);
  await page.evaluate(() => localStorage.clear());
  await openReviewedDemo(page);
  await page.getByRole('button', { name: 'Create share snapshot' }).click();
  const shareUrl = await page.getByLabel('Self-contained review link').inputValue();
  await page.goto(shareUrl);
  await expect(page.getByText('Immutable peer snapshot · read only')).toBeVisible();
  await expectNoSeriousViolations(page);
});
