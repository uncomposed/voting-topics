import { test, expect } from '@playwright/test';
import type { PreferenceSet } from '../src/schema';

const encodeFullSharePayload = (
  kind: 'preference-set' | 'sample-ballot',
  data: PreferenceSet,
  title: string,
): string => Buffer.from(JSON.stringify({
  v: 'vt.full.v1',
  kind,
  title,
  createdAt: new Date().toISOString(),
  data,
})).toString('base64url');

const buildFullShareUrl = (payload: string, base: string): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#full=${payload}`;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('vt.m2')) return;
    window.localStorage.setItem('vt.m2', JSON.stringify({
      state: {
        hasSeenIntroModal: true,
        hasSeenOnboarding: true,
      },
      version: 0,
    }));
  });
});

test('compact share link opens shared preferences', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  const payload = 'eyJ2Ijoic3AtdjEiLCJ0aXAiOltdLCJkc3AiOltdfQ';
  await page.goto(`${baseURL!}#sp=${payload}`);
  await expect(page.getByText('Preferences applied')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('Review Shared Preference Set')).toBeVisible();
});

test('full preference review link can become a reload-safe local copy', async ({ page, baseURL }) => {
  const preferenceSet: PreferenceSet = {
    version: 'tsb.v2',
    title: 'E2E Review Set',
    notes: '',
    topics: [
      {
        id: 'e2e-topic',
        title: 'Clean transit',
        importance: 4,
        stance: 'for',
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] },
      },
    ],
    items: [
      {
        id: 'e2e-item',
        text: 'More frequent buses',
        stars: 5,
        notes: '',
        sources: [],
        topicIds: ['e2e-topic'],
        tags: [],
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
  const url = buildFullShareUrl(
    encodeFullSharePayload('preference-set', preferenceSet, preferenceSet.title),
    baseURL!,
  );

  await page.goto(url);
  await expect(page.getByText('Review Shared Preference Set')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('E2E Review Set')).toBeVisible();

  await page.getByRole('button', { name: 'Make My Copy' }).click();
  await expect(page.getByText('Review Shared Preference Set')).toBeHidden();
  await expect(page).not.toHaveURL(/#full=/);

  await page.reload();
  await expect(page.getByText('Review Shared Preference Set')).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Topic title' })).toHaveValue('Clean transit');
});
