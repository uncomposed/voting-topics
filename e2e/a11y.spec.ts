import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home has no critical a11y violations', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  const axe = new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']);
  const results = await axe.analyze();
  const critical = results.violations.filter(v => ['critical','serious'].includes(v.impact || ''));
  expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
});

