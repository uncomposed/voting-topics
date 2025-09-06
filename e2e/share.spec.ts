import { test, expect } from '@playwright/test';

test('share link prompts to apply', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  const payload = 'eyJ2Ijoic3AtdjEiLCJ0aXAiOltdLCJkc3AiOltdfQ';
  await page.goto(`${baseURL!}#sp=${payload}`);
  await expect(page.getByText('Apply shared preferences?')).toBeVisible({ timeout: 3000 });
});

