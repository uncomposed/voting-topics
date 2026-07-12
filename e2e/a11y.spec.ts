import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeDemoGuide } from './helpers';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('home, editor, and review have no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Start fictional demo' }).click();
  await expectNoSeriousViolations(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await completeDemoGuide(page);
  await expectNoSeriousViolations(page);
});
