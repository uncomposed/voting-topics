import { z } from 'zod';

export const PRIORITY_MENU_VERSION = 'vt.priority-menu.v1' as const;
export const PROFILE_VERSION = 'vt.topic-profile.v3' as const;
export const PREVIOUS_PROFILE_VERSION = 'vt.topic-profile.v2' as const;
export const LEGACY_PROFILE_VERSION = 'vt.topic-profile.v1' as const;
export const ELECTION_VERSION = 'vt.election-template.v3' as const;
export const LEGACY_ELECTION_VERSION = 'vt.election-template.v2' as const;
export const MAP_VERSION = 'vt.election-map.v2' as const;
export const LEGACY_MAP_VERSION = 'vt.election-map.v1' as const;
export const DRAFT_VERSION = 'vt.draft-ballot.v1' as const;
export const GUIDE_VERSION = 'vt.peer-guide.v3' as const;
export const PREVIOUS_GUIDE_VERSION = 'vt.peer-guide.v2' as const;
export const LEGACY_GUIDE_VERSION = 'vt.peer-guide.v1' as const;
export const HANDOFF_VERSION = 'vt.handoff-task.v1' as const;
export const ALGORITHM_VERSION = 'topic-match.v1' as const;

const IdSchema = z.string().trim().min(1).max(120);
const ShortTextSchema = z.string().trim().min(1).max(200);
const StarsSchema = z.number().int().min(0).max(5);
const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const SourceSchema = z.object({
  id: IdSchema,
  label: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2000).refine((value) => /^https?:\/\//u.test(value), {
    message: 'Sources must use an HTTP(S) URL.',
  }),
  evidenceSummary: z.string().trim().max(800).optional(),
  asOfDate: z.string().date().optional(),
});

export const AuthorshipSchema = z.object({
  kind: z.enum(['human', 'chatbot', 'import', 'fork']),
  toolLabel: z.string().trim().max(100).optional(),
  taskId: IdSchema.optional(),
  inputDigest: DigestSchema.optional(),
}).default({ kind: 'human' });

export const VerificationSchema = z.object({
  status: z.enum(['draft', 'verified']),
  verifiedAt: z.string().datetime().optional(),
}).default({ status: 'draft' }).superRefine((value, context) => {
  if (value.status === 'verified' && !value.verifiedAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['verifiedAt'], message: 'Verified work needs a verification timestamp.' });
  }
});

export const PriorityMenuItemSchema = z.object({
  id: IdSchema,
  statement: ShortTextSchema,
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(600).optional(),
  reflectionQuestion: z.string().trim().max(300).optional(),
  revision: z.number().int().positive(),
});

export const PriorityMenuSchema = z.object({
  version: z.literal(PRIORITY_MENU_VERSION),
  id: IdSchema,
  title: ShortTextSchema,
  revision: z.number().int().positive(),
  digest: DigestSchema,
  sourceNote: z.string().trim().min(1).max(1000),
  items: z.array(PriorityMenuItemSchema).min(1).max(300),
});

export const TopicOriginSchema = z.object({
  menuId: IdSchema,
  menuItemId: IdSchema,
  menuRevision: z.number().int().positive(),
  menuDigest: DigestSchema.optional(),
  customized: z.boolean().default(false),
});

const TopicFields = {
  id: IdSchema,
  title: ShortTextSchema,
  description: z.string().trim().max(600).optional(),
  stars: StarsSchema.nullable(),
  category: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1200).optional(),
  sources: z.array(SourceSchema).max(5).default([]),
};

export const TopicSchema = z.object({ ...TopicFields, origin: TopicOriginSchema.optional() });
const RatedTopicFields = { ...TopicFields, stars: StarsSchema };
export const PreviousTopicSchema = z.object({ ...RatedTopicFields, origin: TopicOriginSchema.optional() });
const LegacyTopicSchema = z.object(RatedTopicFields);

function uniqueTopicIds(profile: { topics: Array<{ id: string }> }, context: z.RefinementCtx) {
  const ids = new Set<string>();
  profile.topics.forEach((topic, index) => {
    if (ids.has(topic.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['topics', index, 'id'], message: `Priority id “${topic.id}” is duplicated.` });
    ids.add(topic.id);
  });
}

export const TopicProfileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  id: IdSchema,
  title: ShortTextSchema,
  ownerLabel: z.string().trim().max(100).optional(),
  topics: z.array(TopicSchema).max(100),
  authorship: AuthorshipSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine(uniqueTopicIds);

export const PreviousTopicProfileSchema = z.object({
  version: z.literal(PREVIOUS_PROFILE_VERSION),
  id: IdSchema,
  title: ShortTextSchema,
  ownerLabel: z.string().trim().max(100).optional(),
  topics: z.array(PreviousTopicSchema).max(100),
  authorship: AuthorshipSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine(uniqueTopicIds);

export const LegacyTopicProfileSchema = z.object({
  version: z.literal(LEGACY_PROFILE_VERSION),
  id: IdSchema,
  title: ShortTextSchema,
  ownerLabel: z.string().trim().max(100).optional(),
  topics: z.array(LegacyTopicSchema).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine(uniqueTopicIds);

export const ElectionOptionSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  party: z.string().trim().max(100).optional(),
  description: z.string().trim().max(800).optional(),
  website: z.string().trim().url().max(2000).optional(),
  sourceIds: z.array(IdSchema).max(10).default([]),
});

const ContestBase = z.object({
  id: IdSchema,
  title: ShortTextSchema,
  description: z.string().trim().max(1200).optional(),
  ballotInstructions: z.string().trim().max(1200).optional(),
  sourceIds: z.array(IdSchema).max(10).default([]),
  verification: VerificationSchema,
  options: z.array(ElectionOptionSchema).min(2).max(30),
});

export const FptpContestSchema = ContestBase.extend({ method: z.literal('fptp') });
export const ChooseUpToContestSchema = ContestBase.extend({ method: z.literal('choose-up-to'), maxSelections: z.number().int().min(1).max(20) });
export const RcvContestSchema = ContestBase.extend({ method: z.literal('rcv'), maxRankings: z.number().int().min(1).max(30) });
export const StarContestSchema = ContestBase.extend({ method: z.literal('star') });
export const YesNoContestSchema = ContestBase.extend({ method: z.literal('yes-no') });

export const ContestSchema = z.discriminatedUnion('method', [FptpContestSchema, ChooseUpToContestSchema, RcvContestSchema, StarContestSchema, YesNoContestSchema]);

const LegacyOptionSchema = ElectionOptionSchema.omit({ website: true, sourceIds: true });
const LegacyContestBase = z.object({
  id: IdSchema,
  title: ShortTextSchema,
  description: z.string().trim().max(1200).optional(),
  options: z.array(LegacyOptionSchema).min(2).max(30),
});
const LegacyContestSchema = z.discriminatedUnion('method', [
  LegacyContestBase.extend({ method: z.literal('fptp') }),
  LegacyContestBase.extend({ method: z.literal('choose-up-to'), maxSelections: z.number().int().min(1).max(20) }),
  LegacyContestBase.extend({ method: z.literal('rcv'), maxRankings: z.number().int().min(1).max(30) }),
  LegacyContestBase.extend({ method: z.literal('star') }),
  LegacyContestBase.extend({ method: z.literal('yes-no') }),
]);

function validateElection(election: { contests: Array<z.infer<typeof ContestSchema> | z.infer<typeof LegacyContestSchema>>; sources?: Array<{ id: string }> }, context: z.RefinementCtx) {
  const contestIds = new Set<string>();
  const sourceIds = new Set(election.sources?.map((source) => source.id) ?? []);
  election.contests.forEach((contest, contestIndex) => {
    if (contestIds.has(contest.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'id'], message: 'Contest ids must be unique.' });
    contestIds.add(contest.id);
    const optionIds = new Set<string>();
    contest.options.forEach((option, optionIndex) => {
      if (optionIds.has(option.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'options', optionIndex, 'id'], message: 'Option ids must be unique within a contest.' });
      optionIds.add(option.id);
      if ('sourceIds' in option && Array.isArray(option.sourceIds)) for (const sourceId of option.sourceIds) if (typeof sourceId === 'string' && !sourceIds.has(sourceId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'options', optionIndex, 'sourceIds'], message: `Unknown election source “${sourceId}”.` });
    });
    if ('sourceIds' in contest) for (const sourceId of contest.sourceIds) if (!sourceIds.has(sourceId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'sourceIds'], message: `Unknown election source “${sourceId}”.` });
    if (contest.method === 'choose-up-to' && contest.maxSelections >= contest.options.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'maxSelections'], message: 'Choose-up-to must select fewer than all options.' });
    if (contest.method === 'rcv' && contest.maxRankings > contest.options.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'maxRankings'], message: 'Maximum rankings cannot exceed the number of options.' });
    if (contest.method === 'yes-no' && contest.options.map((option) => option.id).sort().join(',') !== 'no,yes') context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'options'], message: 'Yes/No measures must contain option ids “yes” and “no”.' });
  });
}

export const ElectionLineageSchema = z.object({
  parentElectionId: IdSchema.optional(),
  parentDigest: DigestSchema.optional(),
  importedFrom: z.string().trim().url().max(2000).optional(),
}).default({});

export const ElectionTemplateSchema = z.object({
  version: z.literal(ELECTION_VERSION),
  id: IdSchema,
  title: ShortTextSchema,
  electionDate: z.string().date(),
  jurisdiction: ShortTextSchema,
  isFictional: z.boolean(),
  disclaimer: z.string().trim().min(1).max(600),
  sources: z.array(SourceSchema).max(200).default([]),
  authorship: AuthorshipSchema,
  lineage: ElectionLineageSchema,
  contests: z.array(ContestSchema).min(1).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine(validateElection);

export const LegacyElectionTemplateSchema = z.object({
  version: z.literal(LEGACY_ELECTION_VERSION), id: IdSchema, title: ShortTextSchema,
  electionDate: z.string().date(), jurisdiction: ShortTextSchema, isFictional: z.boolean(),
  disclaimer: z.string().trim().min(1).max(600), contests: z.array(LegacyContestSchema).min(1).max(50),
}).superRefine(validateElection);

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

const AssessmentMeta = {
  authorship: AuthorshipSchema,
  verification: VerificationSchema,
};

export const AssessedMappingSchema = z.object({
  status: z.literal('assessed'), contestId: IdSchema, optionId: IdSchema, topicId: IdSchema,
  stars: StarsSchema, confidence: ConfidenceSchema,
  reason: z.string().trim().min(10).max(1200), sourceIds: z.array(IdSchema).min(1).max(5),
  ...AssessmentMeta,
});

export const UnknownMappingSchema = z.object({
  status: z.literal('unknown'), contestId: IdSchema, optionId: IdSchema, topicId: IdSchema,
  note: z.string().trim().max(500).optional(), ...AssessmentMeta,
});

export const MappingAssessmentSchema = z.discriminatedUnion('status', [AssessedMappingSchema, UnknownMappingSchema]);

const LegacyAssessedMappingSchema = AssessedMappingSchema.omit({ authorship: true, verification: true });
const LegacyUnknownMappingSchema = UnknownMappingSchema.omit({ authorship: true, verification: true });
const LegacyMappingAssessmentSchema = z.discriminatedUnion('status', [LegacyAssessedMappingSchema, LegacyUnknownMappingSchema]);

export const ContestMappingSchema = z.object({ contestId: IdSchema, relevantTopicIds: z.array(IdSchema).min(1).max(20), assessments: z.array(MappingAssessmentSchema).max(600), authorship: AuthorshipSchema, verification: VerificationSchema });
const LegacyContestMappingSchema = z.object({ contestId: IdSchema, relevantTopicIds: z.array(IdSchema).min(1).max(20), assessments: z.array(LegacyMappingAssessmentSchema).max(600) });

function validateMapInternal(map: { sources: Source[]; contests: Array<z.infer<typeof ContestMappingSchema>> }, context: z.RefinementCtx) {
  const sourceIds = new Set<string>();
  map.sources.forEach((source, index) => {
    if (sourceIds.has(source.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['sources', index, 'id'], message: 'Mapping source ids must be unique.' });
    sourceIds.add(source.id);
  });
  const contestIds = new Set<string>();
  map.contests.forEach((contest, contestIndex) => {
    if (contestIds.has(contest.contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'contestId'], message: 'Contest mappings must be unique.' });
    contestIds.add(contest.contestId);
    const relevant = new Set<string>();
    contest.relevantTopicIds.forEach((topicId, topicIndex) => {
      if (relevant.has(topicId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'relevantTopicIds', topicIndex], message: 'Relevant priority ids must be unique.' });
      relevant.add(topicId);
    });
    const cells = new Set<string>();
    contest.assessments.forEach((assessment, assessmentIndex) => {
      const cell = `${assessment.optionId}\u0000${assessment.topicId}`;
      if (cells.has(cell)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'assessments', assessmentIndex], message: 'Option/priority assessments must be unique.' });
      cells.add(cell);
      if (assessment.contestId !== contest.contestId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'assessments', assessmentIndex, 'contestId'], message: 'Assessment contest id must match its containing contest mapping.' });
      if (!relevant.has(assessment.topicId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'assessments', assessmentIndex, 'topicId'], message: 'Assessment priority must be relevant to its contest.' });
      if (assessment.status === 'assessed') for (const sourceId of assessment.sourceIds) if (!sourceIds.has(sourceId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'assessments', assessmentIndex, 'sourceIds'], message: `Unknown mapping source “${sourceId}”.` });
    });
  });
}

export const ElectionMapSchema = z.object({
  version: z.literal(MAP_VERSION), id: IdSchema, electionId: IdSchema, profileId: IdSchema,
  authorLabel: z.string().trim().max(100).optional(), sources: z.array(SourceSchema).max(200),
  contests: z.array(ContestMappingSchema).max(50), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
}).superRefine(validateMapInternal);

export const LegacyElectionMapSchema = z.object({
  version: z.literal(LEGACY_MAP_VERSION), id: IdSchema, electionId: IdSchema, profileId: IdSchema,
  authorLabel: z.string().trim().max(100).optional(), sources: z.array(SourceSchema).max(200),
  contests: z.array(LegacyContestMappingSchema).max(50), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});

export const TopicContributionSchema = z.object({ topicId: IdSchema, voterStars: StarsSchema, optionStars: StarsSchema, confidence: ConfidenceSchema, weightedContribution: z.number() });
export const OptionScoreSchema = z.object({ optionId: IdSchema, score: z.number().min(0).max(5), coverage: z.number().min(0).max(1), contributions: z.array(TopicContributionSchema) });
export const FptpMarkSchema = z.object({ method: z.literal('fptp'), selectedOptionIds: z.array(IdSchema).max(1) });
export const ChooseUpToMarkSchema = z.object({ method: z.literal('choose-up-to'), selectedOptionIds: z.array(IdSchema).max(20) });
export const RcvMarkSchema = z.object({ method: z.literal('rcv'), rankedOptionIds: z.array(IdSchema).max(30) });
export const StarMarkSchema = z.object({ method: z.literal('star'), scores: z.record(IdSchema, StarsSchema) });
export const YesNoMarkSchema = z.object({ method: z.literal('yes-no'), position: z.enum(['yes', 'no', 'abstain']) });
export const BallotMarkSchema = z.discriminatedUnion('method', [FptpMarkSchema, ChooseUpToMarkSchema, RcvMarkSchema, StarMarkSchema, YesNoMarkSchema]);

export const ContestDraftSchema = z.object({ contestId: IdSchema, status: z.enum(['ready', 'research-needed', 'close-call']), optionScores: z.array(OptionScoreSchema), translated: BallotMarkSchema.nullable(), explanation: z.string(), warnings: z.array(z.string()) });
export const DraftBallotSchema = z.object({ version: z.literal(DRAFT_VERSION), algorithmVersion: z.literal(ALGORITHM_VERSION), profileId: IdSchema, electionId: IdSchema, mappingId: IdSchema, contests: z.array(ContestDraftSchema), generatedAt: z.string().datetime() });
export const ContestDecisionSchema = z.object({ contestId: IdSchema, confirmed: z.boolean(), override: BallotMarkSchema.nullable(), personalNote: z.string().trim().max(2000), noteAuthorship: AuthorshipSchema.optional() });

export const ElectionWorkspaceSchema = z.object({
  id: IdSchema, profileId: IdSchema, electionId: IdSchema, mapping: ElectionMapSchema, draft: DraftBallotSchema,
  decisions: z.array(ContestDecisionSchema), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), archived: z.boolean().default(false),
}).superRefine((workspace, context) => {
  if (workspace.mapping.electionId !== workspace.electionId || workspace.draft.electionId !== workspace.electionId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['electionId'], message: 'Election references must agree.' });
  if (workspace.mapping.profileId !== workspace.profileId || workspace.draft.profileId !== workspace.profileId || workspace.mapping.id !== workspace.draft.mappingId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['profileId'], message: 'Profile and mapping references must agree.' });
  const draftContests = new Set(workspace.draft.contests.map((contest) => contest.contestId));
  const decisions = new Set<string>();
  workspace.decisions.forEach((decision, index) => {
    if (!draftContests.has(decision.contestId) || decisions.has(decision.contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'contestId'], message: 'Decisions must refer uniquely to a generated contest.' });
    decisions.add(decision.contestId);
  });
  for (const contestId of draftContests) if (!decisions.has(contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions'], message: `Generated contest “${contestId}” needs a decision record.` });
});

export const GuideLineageSchema = z.object({ parentSnapshotDigest: DigestSchema.nullable(), parentAuthorLabel: z.string().trim().max(100).optional(), changesFromParent: z.array(z.string()).max(100) });
export const PeerGuideSchema = z.object({
  version: z.literal(GUIDE_VERSION), id: IdSchema, authorLabel: z.string().trim().min(1).max(100),
  profile: TopicProfileSchema, election: ElectionTemplateSchema, mapping: ElectionMapSchema, draft: DraftBallotSchema,
  decisions: z.array(ContestDecisionSchema), lineage: GuideLineageSchema, createdAt: z.string().datetime(), snapshotDigest: DigestSchema,
}).superRefine((guide, context) => {
  if (guide.mapping.profileId !== guide.profile.id || guide.draft.profileId !== guide.profile.id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['profile'], message: 'Snapshot profile references must agree.' });
  if (guide.mapping.electionId !== guide.election.id || guide.draft.electionId !== guide.election.id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['election'], message: 'Snapshot election references must agree.' });
  const topics = new Set(guide.profile.topics.map((topic) => topic.id));
  const contests = new Map(guide.election.contests.map((contest) => [contest.id, contest]));
  for (const mapping of guide.mapping.contests) {
    const contest = contests.get(mapping.contestId);
    if (!contest) { context.addIssue({ code: z.ZodIssueCode.custom, path: ['mapping', 'contests'], message: `Unknown mapped contest “${mapping.contestId}”.` }); continue; }
    for (const topicId of mapping.relevantTopicIds) if (!topics.has(topicId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['mapping', 'contests'], message: `Unknown relevant priority “${topicId}”.` });
    const options = new Set(contest.options.map((option) => option.id));
    const cells = new Set(mapping.assessments.map((assessment) => `${assessment.optionId}\u0000${assessment.topicId}`));
    for (const assessment of mapping.assessments) if (!options.has(assessment.optionId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['mapping', 'contests'], message: `Unknown option “${assessment.optionId}” in mapped contest “${mapping.contestId}”.` });
    for (const optionId of options) for (const topicId of mapping.relevantTopicIds) if (!cells.has(`${optionId}\u0000${topicId}`)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['mapping', 'contests'], message: `Missing assessment for ${optionId} × ${topicId}.` });
  }
  const decisionIds = new Set<string>();
  guide.decisions.forEach((decision, index) => {
    const contest = contests.get(decision.contestId);
    if (!contest || decisionIds.has(decision.contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'contestId'], message: 'Snapshot decisions must refer uniquely to election contests.' });
    if (decision.override && contest && decision.override.method !== contest.method) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'override'], message: 'An override must use the contest voting method.' });
    decisionIds.add(decision.contestId);
  });
  for (const contest of guide.election.contests) if (!decisionIds.has(contest.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions'], message: `Contest “${contest.id}” needs a decision record.` });
});

export const PreviousPeerGuideSchema = z.object({
  version: z.literal(PREVIOUS_GUIDE_VERSION), id: IdSchema, authorLabel: z.string().trim().min(1).max(100),
  profile: PreviousTopicProfileSchema, election: ElectionTemplateSchema, mapping: ElectionMapSchema, draft: DraftBallotSchema,
  decisions: z.array(ContestDecisionSchema), lineage: GuideLineageSchema, createdAt: z.string().datetime(), snapshotDigest: DigestSchema,
});

export const LegacyPeerGuideSchema = z.object({
  version: z.literal(LEGACY_GUIDE_VERSION), id: IdSchema, authorLabel: z.string().trim().min(1).max(100),
  profile: LegacyTopicProfileSchema, election: LegacyElectionTemplateSchema, mapping: LegacyElectionMapSchema,
  draft: DraftBallotSchema, decisions: z.array(ContestDecisionSchema), lineage: GuideLineageSchema,
  createdAt: z.string().datetime(), snapshotDigest: DigestSchema,
});

export const HandoffTaskSchema = z.object({
  version: z.literal(HANDOFF_VERSION), id: IdSchema, taskType: z.enum(['priorities', 'election', 'relevance', 'assessment', 'review']),
  inputDigest: DigestSchema, createdAt: z.string().datetime(), instructions: z.string().min(1).max(6000),
  userQuestion: z.string().max(2000).default(''), responseVersion: z.string().min(1).max(100),
  context: z.unknown(), example: z.unknown(),
});

const ProposalHeader = { taskId: IdSchema, inputDigest: DigestSchema };
export const PriorityProposalSchema = z.object({
  version: z.literal('vt.priority-proposal.v1'), ...ProposalHeader,
  selections: z.array(z.object({ menuItemId: IdSchema, stars: StarsSchema, note: z.string().trim().max(600).optional() })).max(100),
  customPriorities: z.array(z.object({ id: IdSchema.optional(), statement: ShortTextSchema, category: z.string().trim().max(80).optional(), stars: StarsSchema, note: z.string().trim().max(600).optional() })).max(50).default([]),
});

export const ElectionProposalSchema = z.object({ version: z.literal('vt.election-proposal.v1'), ...ProposalHeader, election: ElectionTemplateSchema });
export const RelevanceProposalSchema = z.object({
  version: z.literal('vt.relevance-proposal.v1'), ...ProposalHeader,
  contests: z.array(z.object({ contestId: IdSchema, topicIds: z.array(IdSchema).min(1).max(20), reason: z.string().trim().max(800).optional() })).max(50),
});
export const AssessmentBatchSchema = z.object({
  version: z.literal('vt.assessment-batch.v1'), ...ProposalHeader, contestId: IdSchema,
  sources: z.array(SourceSchema).max(100), assessments: z.array(z.discriminatedUnion('status', [
    AssessedMappingSchema.omit({ authorship: true, verification: true }), UnknownMappingSchema.omit({ authorship: true, verification: true }),
  ])).max(600),
});
export const ReviewProposalSchema = z.object({
  version: z.literal('vt.review-proposal.v1'), ...ProposalHeader,
  contests: z.array(z.object({ contestId: IdSchema, personalNote: z.string().trim().max(2000).optional(), concerns: z.array(z.string().trim().min(1).max(500)).max(10).default([]), suggestedOverride: BallotMarkSchema.optional() })).max(50),
});

export type Source = z.infer<typeof SourceSchema>;
export type PriorityMenuItem = z.infer<typeof PriorityMenuItemSchema>;
export type PriorityMenu = z.infer<typeof PriorityMenuSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type TopicProfile = z.infer<typeof TopicProfileSchema>;
export type PreviousTopicProfile = z.infer<typeof PreviousTopicProfileSchema>;
export type ElectionOption = z.infer<typeof ElectionOptionSchema>;
export type Contest = z.infer<typeof ContestSchema>;
export type ElectionTemplate = z.infer<typeof ElectionTemplateSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type MappingAssessment = z.infer<typeof MappingAssessmentSchema>;
export type ContestMapping = z.infer<typeof ContestMappingSchema>;
export type ElectionMap = z.infer<typeof ElectionMapSchema>;
export type TopicContribution = z.infer<typeof TopicContributionSchema>;
export type OptionScore = z.infer<typeof OptionScoreSchema>;
export type BallotMark = z.infer<typeof BallotMarkSchema>;
export type ContestDraft = z.infer<typeof ContestDraftSchema>;
export type DraftBallot = z.infer<typeof DraftBallotSchema>;
export type ContestDecision = z.infer<typeof ContestDecisionSchema>;
export type ElectionWorkspace = z.infer<typeof ElectionWorkspaceSchema>;
export type GuideLineage = z.infer<typeof GuideLineageSchema>;
export type PeerGuide = z.infer<typeof PeerGuideSchema>;
export type PreviousPeerGuide = z.infer<typeof PreviousPeerGuideSchema>;
export type LegacyPeerGuide = z.infer<typeof LegacyPeerGuideSchema>;
export type HandoffTask = z.infer<typeof HandoffTaskSchema>;
export type PriorityProposal = z.infer<typeof PriorityProposalSchema>;
export type ElectionProposal = z.infer<typeof ElectionProposalSchema>;
export type RelevanceProposal = z.infer<typeof RelevanceProposalSchema>;
export type AssessmentBatch = z.infer<typeof AssessmentBatchSchema>;
export type ReviewProposal = z.infer<typeof ReviewProposalSchema>;

export function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export function verifiedNow(now = new Date().toISOString()) {
  return { status: 'verified' as const, verifiedAt: now };
}

export function upgradeTopicProfile(input: unknown): TopicProfile {
  const version = typeof input === 'object' && input ? (input as { version?: unknown }).version : undefined;
  if (version === PROFILE_VERSION) return TopicProfileSchema.parse(input);
  if (version === PREVIOUS_PROFILE_VERSION) {
    const previous = PreviousTopicProfileSchema.parse(input);
    return TopicProfileSchema.parse({ ...previous, version: PROFILE_VERSION });
  }
  const legacy = LegacyTopicProfileSchema.parse(input);
  return TopicProfileSchema.parse({ ...legacy, version: PROFILE_VERSION, authorship: { kind: 'import' } });
}

export function upgradeElection(input: unknown, now = new Date().toISOString()): ElectionTemplate {
  const version = typeof input === 'object' && input ? (input as { version?: unknown }).version : undefined;
  if (version === ELECTION_VERSION) return ElectionTemplateSchema.parse(input);
  const legacy = LegacyElectionTemplateSchema.parse(input);
  return ElectionTemplateSchema.parse({
    ...legacy, version: ELECTION_VERSION, sources: [], authorship: { kind: 'import' }, lineage: {}, createdAt: now, updatedAt: now,
    contests: legacy.contests.map((contest) => ({ ...contest, sourceIds: [], verification: { status: 'draft' }, options: contest.options.map((option) => ({ ...option, sourceIds: [] })) })),
  });
}

export function upgradeElectionMap(input: unknown, now = new Date().toISOString()): ElectionMap {
  const version = typeof input === 'object' && input ? (input as { version?: unknown }).version : undefined;
  if (version === MAP_VERSION) return ElectionMapSchema.parse(input);
  const legacy = LegacyElectionMapSchema.parse(input);
  return ElectionMapSchema.parse({
    ...legacy, version: MAP_VERSION,
    contests: legacy.contests.map((contest) => ({ ...contest, authorship: { kind: 'import' }, verification: verifiedNow(now), assessments: contest.assessments.map((assessment) => ({ ...assessment, authorship: { kind: 'import' }, verification: verifiedNow(now) })) })),
  });
}
