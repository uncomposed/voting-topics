import { test, expect } from '@playwright/test';

test('compact share link opens shared preferences', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  const payload = 'eyJ2Ijoic3AtdjEiLCJ0aXAiOltdLCJkc3AiOltdfQ';
  await page.goto(`${baseURL!}#sp=${payload}`);
  await expect(page.getByText('Preferences applied')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('Review Shared Preference Set')).toBeVisible();
});
