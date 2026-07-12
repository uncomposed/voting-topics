import { expect, type Page } from '@playwright/test';

async function completeContest(page: Page, contestId: string, choice: () => Promise<void>) {
  const card = page.getByTestId(`contest-${contestId}`);
  await choice();
  await card.getByLabel(/Rationale for/i).fill(
    'This recommendation best advances accountable public services while respecting the important tradeoffs.',
  );
  await card.getByLabel(/Desired outcome for/i).fill('Accountable and accessible public services');
  await card.getByRole('button', { name: 'Add and link' }).click();
}

export async function completeDemoGuide(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start fictional demo' }).click();

  await completeContest(page, 'mayor', async () => {
    await page.getByLabel('Recommend Avery Stone for Mayor').check();
  });
  await completeContest(page, 'county-council', async () => {
    await page.getByLabel('Recommend Casey Brooks for County Council At-Large').check();
    await page.getByLabel('Recommend Riley Chen for County Council At-Large').check();
  });
  await completeContest(page, 'school-board', async () => {
    await page.getByLabel('Recommend Jamie Park for School Board').check();
  });
  await completeContest(page, 'transit-bond', async () => {
    await page.getByTestId('contest-transit-bond').getByRole('radio', { name: 'Yes' }).check();
  });
  await completeContest(page, 'library-levy', async () => {
    await page.getByTestId('contest-library-levy').getByRole('radio', { name: 'No' }).check();
  });

  await expect(page.getByText('5 of 5 contests complete')).toBeVisible();
  await page.getByRole('button', { name: 'Review guide' }).click();
  await expect(page.getByTestId('review-mayor').getByText('Avery Stone')).toBeVisible();
}
