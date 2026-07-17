import { generateDraft } from './scoring';
import {
  ELECTION_VERSION,
  MAP_VERSION,
  PROFILE_VERSION,
  ElectionMapSchema,
  ElectionTemplateSchema,
  ElectionWorkspaceSchema,
  TopicProfileSchema,
  type Confidence,
  type ElectionMap,
  type ElectionTemplate,
  type ElectionWorkspace,
  type TopicProfile,
} from './schema';

const NOW = '2026-07-01T12:00:00.000Z';

export const DEMO_PROFILE: TopicProfile = TopicProfileSchema.parse({
  version: PROFILE_VERSION,
  id: 'profile-riverbend',
  title: 'My reusable community priorities',
  ownerLabel: 'Your politically activated friend',
  createdAt: NOW,
  updatedAt: NOW,
  topics: [
    { id: 'housing', title: 'More residents can afford stable housing near jobs and services', stars: 5, category: 'Cost of living', sources: [] },
    { id: 'transit', title: 'People can reliably reach daily needs without owning a car', stars: 4, category: 'Mobility', sources: [] },
    { id: 'climate', title: 'Local decisions reduce long-term climate pollution and risk', stars: 4, category: 'Environment', sources: [] },
    { id: 'small-business', title: 'Small local businesses can start, survive, and grow', stars: 3, category: 'Local economy', sources: [] },
    { id: 'public-trust', title: 'Public decisions are transparent and answerable to residents', stars: 5, category: 'Government', sources: [] },
    { id: 'student-support', title: 'Every student can access the support needed to learn', stars: 5, category: 'Education', sources: [] },
    { id: 'safe-streets', title: 'People of every age can travel on streets without serious injury', stars: 4, category: 'Safety', sources: [] },
    { id: 'library-access', title: 'Residents can freely access useful information and community space', stars: 3, category: 'Community', sources: [] },
    { id: 'health-access', title: 'Residents can get timely, affordable physical and mental health care', stars: 4, category: 'Health', sources: [] },
    { id: 'water', title: 'Drinking water remains safe and resilient for future residents', stars: 5, category: 'Infrastructure', sources: [] },
  ],
});

export const DEMO_ELECTION: ElectionTemplate = ElectionTemplateSchema.parse({
  version: ELECTION_VERSION,
  id: 'riverbend-2026',
  title: 'Riverbend 2026 community election',
  electionDate: '2026-11-03',
  jurisdiction: 'Riverbend County',
  isFictional: true,
  disclaimer: 'Fictional demonstration only. Every person, measure, claim, and source is invented for product testing—not voting advice.',
  contests: [
    { id: 'mayor', title: 'Mayor', method: 'fptp', options: [{ id: 'avery', name: 'Avery Stone' }, { id: 'jordan', name: 'Jordan Vale' }] },
    { id: 'council', title: 'County Council — choose up to two', method: 'choose-up-to', maxSelections: 2, options: [{ id: 'casey', name: 'Casey Brooks' }, { id: 'riley', name: 'Riley Chen' }, { id: 'sam', name: 'Sam Diaz' }] },
    { id: 'school', title: 'School Board — ranked choice', method: 'rcv', maxRankings: 3, options: [{ id: 'jamie', name: 'Jamie Park' }, { id: 'quinn', name: 'Quinn Bell' }, { id: 'taylor', name: 'Taylor Okafor' }] },
    { id: 'parks', title: 'Parks Commissioner — STAR voting', method: 'star', options: [{ id: 'morgan', name: 'Morgan Reed' }, { id: 'devon', name: 'Devon Ibarra' }] },
    { id: 'water-bond', title: 'Water resilience bond', method: 'yes-no', options: [{ id: 'yes', name: 'Yes' }, { id: 'no', name: 'No' }] },
  ],
});

export const SECOND_DEMO_ELECTION: ElectionTemplate = ElectionTemplateSchema.parse({
  version: ELECTION_VERSION,
  id: 'riverbend-2027-special',
  title: 'Riverbend 2027 special election',
  electionDate: '2027-05-04',
  jurisdiction: 'Riverbend County',
  isFictional: true,
  disclaimer: 'Fictional demonstration only. This second election proves that one topic profile can be reused without re-entry.',
  contests: [{ id: 'clinic-measure', title: 'Community clinic measure', method: 'yes-no', options: [{ id: 'yes', name: 'Yes' }, { id: 'no', name: 'No' }] }],
});

const SOURCES = [
  { id: 'source-mayor', label: 'Fictional mayor questionnaire', url: 'https://example.org/riverbend/mayor-questionnaire' },
  { id: 'source-council', label: 'Fictional council forum transcript', url: 'https://example.org/riverbend/council-forum' },
  { id: 'source-school', label: 'Fictional school board interviews', url: 'https://example.org/riverbend/school-board' },
  { id: 'source-parks', label: 'Fictional parks candidate statements', url: 'https://example.org/riverbend/parks' },
  { id: 'source-water', label: 'Fictional water bond analysis', url: 'https://example.org/riverbend/water-bond' },
];

type Cell = [optionId: string, topicId: string, stars: number, confidence?: Confidence];

function contestMapping(contestId: string, topicIds: string[], sourceId: string, cells: Cell[]) {
  return {
    contestId,
    relevantTopicIds: topicIds,
    assessments: cells.map(([optionId, topicId, stars, confidence = 'high']) => ({
      status: 'assessed' as const,
      contestId,
      optionId,
      topicId,
      stars,
      confidence,
      reason: `The fictional source provides a concrete record supporting this ${stars}-star fit assessment.`,
      sourceIds: [sourceId],
    })),
  };
}

export const DEMO_MAP: ElectionMap = ElectionMapSchema.parse({
  version: MAP_VERSION,
  id: 'map-riverbend-2026',
  electionId: DEMO_ELECTION.id,
  profileId: DEMO_PROFILE.id,
  authorLabel: 'Your politically activated friend',
  sources: SOURCES,
  createdAt: NOW,
  updatedAt: NOW,
  contests: [
    contestMapping('mayor', ['housing', 'public-trust', 'transit'], 'source-mayor', [
      ['avery', 'housing', 5], ['avery', 'public-trust', 4], ['avery', 'transit', 4], ['jordan', 'housing', 2], ['jordan', 'public-trust', 3], ['jordan', 'transit', 2],
    ]),
    contestMapping('council', ['small-business', 'safe-streets'], 'source-council', [
      ['casey', 'small-business', 5], ['casey', 'safe-streets', 3], ['riley', 'small-business', 3], ['riley', 'safe-streets', 5], ['sam', 'small-business', 2], ['sam', 'safe-streets', 2],
    ]),
    contestMapping('school', ['student-support', 'library-access'], 'source-school', [
      ['jamie', 'student-support', 5], ['jamie', 'library-access', 5], ['quinn', 'student-support', 3], ['quinn', 'library-access', 4], ['taylor', 'student-support', 2], ['taylor', 'library-access', 3],
    ]),
    contestMapping('parks', ['climate', 'health-access'], 'source-parks', [
      ['morgan', 'climate', 5], ['morgan', 'health-access', 4], ['devon', 'climate', 3], ['devon', 'health-access', 4],
    ]),
    contestMapping('water-bond', ['water', 'public-trust'], 'source-water', [
      ['yes', 'water', 5], ['yes', 'public-trust', 4], ['no', 'water', 1], ['no', 'public-trust', 3],
    ]),
  ],
});

export function createDemoWorkspace(): ElectionWorkspace {
  const draft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, DEMO_MAP, NOW);
  return ElectionWorkspaceSchema.parse({
    id: 'workspace-riverbend-2026',
    election: DEMO_ELECTION,
    mapping: DEMO_MAP,
    draft,
    decisions: DEMO_ELECTION.contests.map((contest) => ({ contestId: contest.id, confirmed: false, override: null, personalNote: '' })),
    createdAt: NOW,
    updatedAt: NOW,
  });
}

export function blankMapForElection(election: ElectionTemplate, profile: TopicProfile, now = new Date().toISOString()): ElectionMap {
  return ElectionMapSchema.parse({ version: MAP_VERSION, id: `map-${election.id}`, electionId: election.id, profileId: profile.id, authorLabel: profile.ownerLabel, sources: [], contests: [], createdAt: now, updatedAt: now });
}
