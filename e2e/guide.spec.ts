import { expect, test } from '@playwright/test';
import { openReviewedDemo, startDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('activated friend shares; peer inspects, forks, changes, diffs, reshares, and reopens', async ({ page }) => {
  await openReviewedDemo(page);
  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export peer guide JSON' }).click();
  expect((await exportPromise).suggestedFilename()).toBe('peer-sample-ballot.json');
  await page.getByRole('button', { name: 'Create share snapshot' }).click();
  const parentUrl = await page.getByLabel('Self-contained review link').inputValue();
  expect(parentUrl).toContain('#guide=p3.');
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
  await expect(page.getByRole('heading', { name: 'What outcomes matter to you?' })).toBeVisible();

  const housingCard = page.locator('.topic-card').filter({ hasText: 'More residents can afford stable housing near jobs and services' });
  await housingCard.getByRole('button', { name: '1 stars' }).click();
  await page.getByRole('button', { name: '4 Draft & review' }).click();
  await expect(page.getByText(/5 → 1 stars/u)).toBeVisible();
  await expect(page.getByText('Scores changed: mayor')).toBeVisible();
  await expect(page.getByText('Scores changed: council')).toHaveCount(0);

  const confirmations = page.getByLabel(/I reviewed the evidence/u);
  for (let index = 0; index < 5; index += 1) await confirmations.nth(index).check();
  await page.getByRole('button', { name: '5 Share' }).click();
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
  await page.getByRole('button', { name: '3 Pair & research' }).click();
  await expect(page.getByRole('heading', { name: 'Connect your priorities to this election' })).toBeVisible();
  await page.getByRole('button', { name: '2 Option research' }).click();
  await expect(page.locator('.option-assessment')).toHaveCount(2);
  await page.getByRole('button', { name: 'County Council — choose up to two' }).click();
  await expect(page.locator('.option-assessment')).toHaveCount(3);
});

test('selected election-source checkboxes stay compact and inline', async ({ page }) => {
  await startDemo(page);
  await page.getByRole('button', { name: '2 Election' }).click();
  const sourceLabel = page.locator('.source-checks label').first();
  const layout = await sourceLabel.evaluate((label) => {
    const checkbox = label.querySelector('input[type="checkbox"]')!;
    const box = checkbox.getBoundingClientRect();
    const row = label.getBoundingClientRect();
    return { display: getComputedStyle(label).display, width: box.width, height: box.height, rowHeight: row.height, topDelta: Math.abs(box.top - row.top) };
  });
  expect(layout.display).toBe('flex');
  expect(layout.width).toBeLessThanOrEqual(24);
  expect(layout.height).toBeLessThanOrEqual(24);
  expect(layout.rowHeight).toBeLessThan(32);
  expect(layout.topDelta).toBeLessThan(6);
});

test('opening a direct assessment editor never creates or verifies a synthetic claim', async ({ page }) => {
  await startDemo(page);
  const before = await page.evaluate(() => {
    const workspaces = JSON.parse(localStorage.getItem('vt.ballot-workspaces.v2') ?? '[]');
    workspaces[0].mapping.contests[0].assessments = workspaces[0].mapping.contests[0].assessments.filter((cell: { optionId: string; topicId: string }) => cell.optionId !== 'avery' || cell.topicId !== 'housing');
    localStorage.setItem('vt.ballot-workspaces.v2', JSON.stringify(workspaces));
    return workspaces[0].mapping.contests[0].assessments.length;
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume research' }).click();
  await page.getByRole('button', { name: '2 Option research' }).click();
  const card = page.locator('.option-assessment').filter({ hasText: 'Avery Stone' });
  await expect(card).toContainText('incomplete');
  await card.getByRole('button', { name: 'Assess with evidence' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vt.ballot-workspaces.v2') ?? '[]')[0].mapping.contests[0].assessments.length)).toBe(before);
  await expect(card.getByText('Unsaved evidence assessment')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Save assessment · human verified' })).toBeDisabled();
  await card.getByRole('button', { name: '5 stars' }).click();
  await card.getByLabel('Confidence').selectOption('high');
  await card.getByLabel(/Evidence reason/u).fill('The cited source provides a concrete record for this fit.');
  await card.getByRole('combobox', { name: /^Cited source/u }).selectOption({ label: 'Fictional mayor questionnaire' });
  await card.getByRole('button', { name: 'Save assessment · human verified' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vt.ballot-workspaces.v2') ?? '[]')[0].mapping.contests[0].assessments.length)).toBe(before + 1);
  await expect(card).toContainText('Saved and human verified');
});

test('malformed link and JSON import preserve local work', async ({ page }) => {
  await startDemo(page);
  const stored = await page.evaluate(() => localStorage.getItem('vt.ballot-workspaces.v2'));
  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByText('Import a portable artifact').click();
  await page.getByLabel('Choose JSON file').setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from('{not JSON') });
  await expect(page.getByRole('alert')).toContainText('Local work was not changed');
  expect(await page.evaluate(() => localStorage.getItem('vt.ballot-workspaces.v2'))).toBe(stored);
  await page.goto('/#guide=p1.damaged');
  await expect(page.getByText('This snapshot is damaged, stale, or incomplete. Local work was not changed.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vt.ballot-workspaces.v2'))).toBe(stored);
});

test('legacy vt.m2 can be previewed, cancelled, and downloaded byte for byte', async ({ page }) => {
  const raw = JSON.stringify({ state: { version: 'tsb.v2', title: 'Old topics', topics: [{ id: 'category', title: 'Housing', importance: 2 }], items: [{ id: 'item', text: 'More people can afford stable homes', stars: 5, topicIds: ['category'], sources: [] }] } });
  await page.evaluate((value) => localStorage.setItem('vt.m2', value), raw);
  await page.reload();
  await page.getByRole('button', { name: 'Preview conversion' }).click();
  await expect(page.getByText(/tsb.v2 → vt.topic-profile.v3/u)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download exact raw data' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('vt-m2-exact-backup.json');
  expect(await page.evaluate(() => localStorage.getItem('vt.m2'))).toBe(raw);
});

test('v2 profile storage is copied to v3 without changing ratings or deleting old bytes', async ({ page }) => {
  const raw = JSON.stringify([{ version: 'vt.topic-profile.v2', id: 'previous-profile', title: 'Previous profile', topics: [{ id: 'keep-zero', title: 'Keep this priority without calculation weight', stars: 0, sources: [] }, { id: 'rated', title: 'Retain this prior rating', stars: 4, sources: [] }], authorship: { kind: 'human' }, createdAt: '2026-07-01T12:00:00.000Z', updatedAt: '2026-07-01T12:00:00.000Z' }]);
  await page.evaluate((value) => localStorage.setItem('vt.topic-profiles.v2', value), raw);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Previous profile' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vt.topic-profiles.v2'))).toBe(raw);
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('vt.topic-profiles.v3') ?? '[]')[0]);
  expect(migrated.version).toBe('vt.topic-profile.v3');
  expect(migrated.topics.map((topic: { stars: number | null }) => topic.stars)).toEqual([0, 4]);
});

test('direct path creates priorities and an independently reusable election without a chatbot', async ({ page }) => {
  await page.getByRole('button', { name: 'Create a priority profile' }).click();
  await expect(page.getByRole('heading', { name: 'What outcomes matter to you?' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Category card', exact: true }).selectOption('All categories');
  await page.getByLabel('Search within this view').fill('personal data');
  await page.getByText('People can understand and control how organizations use their personal data').click();
  const privacyStatement = 'People can understand and control how organizations use their personal data';
  await page.getByRole('group', { name: `Influence rating for ${privacyStatement}` }).getByRole('button', { name: '4 stars' }).click();
  await expect(page.getByText('1 selected outcomes; 0 Unrated.')).toBeVisible();
  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByRole('button', { name: 'Create an election' }).click();
  await expect(page.getByRole('heading', { name: 'Define the ballot voters will see' })).toBeVisible();
  await page.getByLabel('Source label').fill('Official election page');
  await page.getByLabel('HTTPS URL').fill('https://example.org/official');
  await page.getByRole('button', { name: 'Add official source' }).click();
  await page.getByLabel('Official election page').first().check();
  await page.getByRole('button', { name: 'Use contest sources for all options' }).click();
  await page.getByLabel(/I checked these options and voting rules/u).check();
  const electionDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export election JSON' }).click();
  expect((await electionDownload).suggestedFilename()).toBe('voting-topics-election.json');
  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByRole('button', { name: 'Pair and research' }).click();
  await expect(page.getByRole('heading', { name: 'Connect your priorities to this election' })).toBeVisible();
  await page.getByLabel('People can understand and control how organizations use their personal data').check();
  await page.getByRole('button', { name: 'Continue to option research' }).click();
  await page.getByLabel('Source label').fill('Candidate statements');
  await page.getByLabel('HTTP(S) URL').fill('https://example.org/candidate-statements');
  await page.getByRole('button', { name: 'Add source' }).click();
  const assessmentCards = page.locator('.option-assessment');
  for (let index = 0; index < 2; index += 1) {
    const card = assessmentCards.nth(index);
    await card.getByRole('button', { name: 'Assess with evidence' }).click();
    await card.getByRole('button', { name: `${index === 0 ? 5 : 1} stars` }).click();
    await card.getByLabel('Confidence').selectOption('high');
    await card.getByLabel(/Evidence reason/u).fill(index === 0 ? 'The cited source strongly supports this outcome.' : 'The cited source conflicts with this outcome.');
    await card.getByRole('combobox', { name: /^Cited source/u }).selectOption({ label: 'Candidate statements' });
    await card.getByRole('button', { name: 'Save assessment · human verified' }).click();
  }
  await page.getByRole('button', { name: 'Continue to draft & review' }).click();
  await page.getByLabel('Human contest override').selectOption({ label: 'Option A' });
  await page.getByLabel(/I reviewed the evidence/u).check();
  await page.getByRole('button', { name: 'Continue to share' }).click();
  await page.getByLabel(/I reviewed these amber warnings/u).check();
  await page.getByRole('button', { name: 'Create snapshot with warnings' }).click();
  await expect(page.locator('.publish-panel .notice')).toContainText('saved locally');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vt.peer-guides.v3') ?? '[]').length)).toBe(1);
});

test('optional chatbot handoff stages and previews a task-scoped priority proposal', async ({ page }) => {
  await startDemo(page);
  await page.getByText('Optional chatbot discussion').click();
  await page.getByText('Work with a chatbot').click();
  await page.getByLabel('What do you want to discuss or offload?').fill('Help me consider work and income tradeoffs.');
  await page.getByRole('button', { name: 'Prepare task packet' }).click();
  const packet = await page.getByLabel('Task packet').inputValue();
  const taskId = packet.match(/Task id: (.+)/u)?.[1];
  const inputDigest = packet.match(/Input digest: ([a-f0-9]{64})/u)?.[1];
  expect(taskId).toBeTruthy(); expect(inputDigest).toBeTruthy();
  const response = { version: 'vt.priority-proposal.v1', taskId, inputDigest, selections: [{ menuItemId: 'economy-work-1', stars: 5, note: 'This was central in our discussion.' }], customPriorities: [] };
  await page.getByLabel('Paste the returned JSON or one JSON code block').fill(`Here is the result:\n\n\`\`\`json\n${JSON.stringify(response)}\n\`\`\``);
  await page.getByRole('button', { name: 'Validate and preview' }).click();
  await expect(page.getByRole('heading', { name: 'Review proposed changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept selected verified changes' }).click();
  await expect(page.getByText('People who work full time can afford a stable standard of living').last()).toBeVisible();
});

test('a handoff prepared before direct edits becomes stale and cannot be accepted', async ({ page }) => {
  await startDemo(page);
  await page.getByText('Optional chatbot discussion').click();
  await page.getByText('Work with a chatbot').click();
  await page.getByRole('button', { name: 'Prepare task packet' }).click();
  const packet = await page.getByLabel('Task packet').inputValue();
  const taskId = packet.match(/Task id: (.+)/u)?.[1];
  const inputDigest = packet.match(/Input digest: ([a-f0-9]{64})/u)?.[1];
  const response = { version: 'vt.priority-proposal.v1', taskId, inputDigest, selections: [{ menuItemId: 'economy-work-1', stars: 5 }], customPriorities: [] };
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByText('The tax burden is understandable and predictable', { exact: true }).click();
  await page.getByLabel('Paste the returned JSON or one JSON code block').fill(JSON.stringify(response));
  await page.getByRole('button', { name: 'Validate and preview' }).click();
  await expect(page.getByRole('alert')).toContainText('inputs changed after this task packet');
  await expect(page.getByRole('heading', { name: 'Review proposed changes' })).toHaveCount(0);
});

test('mixed loop verifies a chatbot-researched election and contest batch before sharing', async ({ page }) => {
  await page.getByRole('button', { name: 'Create a priority profile' }).click();
  await page.getByRole('combobox', { name: 'Category card', exact: true }).selectOption('All categories');
  await page.getByLabel('Search within this view').fill('personal data');
  const priorityStatement = 'People can understand and control how organizations use their personal data';
  await page.getByText(priorityStatement).click();
  await page.getByRole('group', { name: `Influence rating for ${priorityStatement}` }).getByRole('button', { name: '4 stars' }).click();
  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByRole('button', { name: 'Create an election' }).click();

  await page.getByText('Optional chatbot election research').click();
  await page.getByText('Work with a chatbot').click();
  await page.getByRole('button', { name: 'Prepare task packet' }).click();
  let packet = await page.getByLabel('Task packet').inputValue();
  let taskId = packet.match(/Task id: (.+)/u)?.[1];
  let inputDigest = packet.match(/Input digest: ([a-f0-9]{64})/u)?.[1];
  const currentElection = await page.evaluate(() => JSON.parse(localStorage.getItem('vt.elections.v3') ?? '[]')[0]);
  const official = { id: 'official-election', label: 'Official election notice', url: 'https://example.org/official-election' };
  const researchedElection = {
    ...currentElection,
    sources: [official],
    contests: currentElection.contests.map((contest: { sourceIds: string[]; options: Array<{ sourceIds: string[] }> }) => ({ ...contest, sourceIds: [official.id], options: contest.options.map((option) => ({ ...option, sourceIds: [official.id] })) })),
  };
  await page.getByLabel('Paste the returned JSON or one JSON code block').fill(JSON.stringify({ version: 'vt.election-proposal.v1', taskId, inputDigest, election: researchedElection }));
  await page.getByRole('button', { name: 'Validate and preview' }).click();
  await expect(page.getByText('Official sources: 0 → 1')).toBeVisible();
  await page.getByRole('button', { name: 'Accept selected verified changes' }).click();
  await page.getByLabel(/I checked these options and voting rules/u).check();

  await page.getByRole('button', { name: 'Voting Topics' }).click();
  await page.getByRole('button', { name: 'Pair and research' }).click();
  await page.getByLabel(priorityStatement).check();
  await page.getByRole('button', { name: 'Continue to option research' }).click();
  await page.getByText('Optional chatbot evidence research').click();
  await page.getByText('Work with a chatbot').click();
  await page.getByRole('button', { name: 'Prepare task packet' }).click();
  packet = await page.getByLabel('Task packet').inputValue();
  taskId = packet.match(/Task id: (.+)/u)?.[1];
  inputDigest = packet.match(/Input digest: ([a-f0-9]{64})/u)?.[1];
  const researchContext = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('vt.topic-profiles.v3') ?? '[]')[0];
    const election = JSON.parse(localStorage.getItem('vt.elections.v3') ?? '[]')[0];
    const workspace = JSON.parse(localStorage.getItem('vt.ballot-workspaces.v2') ?? '[]')[0];
    return { topicId: profile.topics[0].id, contest: election.contests[0], workspace };
  });
  const evidence = { id: 'candidate-evidence', label: 'Candidate evidence', url: 'https://example.org/candidate-evidence' };
  const assessments = researchContext.contest.options.map((option: { id: string }, index: number) => ({ status: 'assessed', contestId: researchContext.contest.id, optionId: option.id, topicId: researchContext.topicId, stars: index === 0 ? 5 : 1, confidence: 'high', reason: index === 0 ? 'The cited record strongly supports the selected priority outcome.' : 'The cited record conflicts with the selected priority outcome.', sourceIds: [evidence.id] }));
  await page.getByLabel('Paste the returned JSON or one JSON code block').fill(JSON.stringify({ version: 'vt.assessment-batch.v1', taskId, inputDigest, contestId: researchContext.contest.id, sources: [evidence], assessments }));
  await page.getByRole('button', { name: 'Validate and preview' }).click();
  await expect(page.getByText(new RegExp(`Option A × ${priorityStatement}`, 'u'))).toBeVisible();
  await page.getByRole('button', { name: 'Accept selected verified changes' }).click();
  await page.getByRole('button', { name: '4 Draft & review' }).click();
  await page.getByLabel(/I reviewed the evidence/u).check();
  await page.getByRole('button', { name: '5 Share' }).click();
  await page.getByRole('button', { name: 'Create share snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('saved locally');
});
