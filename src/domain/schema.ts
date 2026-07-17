import { z } from 'zod';

export const PROFILE_VERSION = 'vt.topic-profile.v1' as const;
export const ELECTION_VERSION = 'vt.election-template.v2' as const;
export const MAP_VERSION = 'vt.election-map.v1' as const;
export const DRAFT_VERSION = 'vt.draft-ballot.v1' as const;
export const GUIDE_VERSION = 'vt.peer-guide.v1' as const;
export const ALGORITHM_VERSION = 'topic-match.v1' as const;

const IdSchema = z.string().trim().min(1).max(120);
const ShortTextSchema = z.string().trim().min(1).max(200);
const StarsSchema = z.number().int().min(0).max(5);

export const SourceSchema = z.object({
  id: IdSchema,
  label: z.string().trim().min(1).max(160),
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
      message: 'Sources must use an HTTP(S) URL.',
    }),
});

export const TopicSchema = z.object({
  id: IdSchema,
  title: ShortTextSchema,
  description: z.string().trim().max(600).optional(),
  stars: StarsSchema,
  category: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1200).optional(),
  sources: z.array(SourceSchema).max(5).default([]),
});

export const TopicProfileSchema = z
  .object({
    version: z.literal(PROFILE_VERSION),
    id: IdSchema,
    title: ShortTextSchema,
    ownerLabel: z.string().trim().max(100).optional(),
    topics: z.array(TopicSchema).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((profile, context) => {
    const ids = new Set<string>();
    profile.topics.forEach((topic, index) => {
      if (ids.has(topic.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['topics', index, 'id'],
          message: `Topic id “${topic.id}” is duplicated.`,
        });
      }
      ids.add(topic.id);
    });
  });

export const ElectionOptionSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  party: z.string().trim().max(100).optional(),
  description: z.string().trim().max(800).optional(),
});

const ContestBase = z.object({
  id: IdSchema,
  title: ShortTextSchema,
  description: z.string().trim().max(1200).optional(),
  options: z.array(ElectionOptionSchema).min(2).max(30),
});

export const FptpContestSchema = ContestBase.extend({ method: z.literal('fptp') });
export const ChooseUpToContestSchema = ContestBase.extend({
  method: z.literal('choose-up-to'),
  maxSelections: z.number().int().min(1).max(20),
});
export const RcvContestSchema = ContestBase.extend({
  method: z.literal('rcv'),
  maxRankings: z.number().int().min(1).max(30),
});
export const StarContestSchema = ContestBase.extend({ method: z.literal('star') });
export const YesNoContestSchema = ContestBase.extend({ method: z.literal('yes-no') });

export const ContestSchema = z.discriminatedUnion('method', [
  FptpContestSchema,
  ChooseUpToContestSchema,
  RcvContestSchema,
  StarContestSchema,
  YesNoContestSchema,
]);

export const ElectionTemplateSchema = z
  .object({
    version: z.literal(ELECTION_VERSION),
    id: IdSchema,
    title: ShortTextSchema,
    electionDate: z.string().date(),
    jurisdiction: ShortTextSchema,
    isFictional: z.boolean(),
    disclaimer: z.string().trim().min(1).max(600),
    contests: z.array(ContestSchema).min(1).max(50),
  })
  .superRefine((election, context) => {
    const contestIds = new Set<string>();
    election.contests.forEach((contest, contestIndex) => {
      if (contestIds.has(contest.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'id'], message: 'Contest ids must be unique.' });
      }
      contestIds.add(contest.id);
      const optionIds = new Set<string>();
      contest.options.forEach((option, optionIndex) => {
        if (optionIds.has(option.id)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'options', optionIndex, 'id'], message: 'Option ids must be unique within a contest.' });
        }
        optionIds.add(option.id);
      });
      if (contest.method === 'choose-up-to' && contest.maxSelections >= contest.options.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'maxSelections'], message: 'Choose-up-to must select fewer than all options.' });
      }
      if (contest.method === 'rcv' && contest.maxRankings > contest.options.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'maxRankings'], message: 'Maximum rankings cannot exceed the number of options.' });
      }
      if (contest.method === 'yes-no') {
        const ids = contest.options.map((option) => option.id).sort();
        if (ids.join(',') !== 'no,yes') {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['contests', contestIndex, 'options'], message: 'Yes/No measures must contain options with ids “yes” and “no”.' });
        }
      }
    });
  });

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const AssessedMappingSchema = z.object({
  status: z.literal('assessed'),
  contestId: IdSchema,
  optionId: IdSchema,
  topicId: IdSchema,
  stars: StarsSchema,
  confidence: ConfidenceSchema,
  reason: z.string().trim().min(10).max(1200),
  sourceIds: z.array(IdSchema).min(1).max(5),
});

export const UnknownMappingSchema = z.object({
  status: z.literal('unknown'),
  contestId: IdSchema,
  optionId: IdSchema,
  topicId: IdSchema,
  note: z.string().trim().max(500).optional(),
});

export const MappingAssessmentSchema = z.discriminatedUnion('status', [
  AssessedMappingSchema,
  UnknownMappingSchema,
]);

export const ContestMappingSchema = z.object({
  contestId: IdSchema,
  relevantTopicIds: z.array(IdSchema).min(1).max(10),
  assessments: z.array(MappingAssessmentSchema).max(300),
});

export const ElectionMapSchema = z.object({
  version: z.literal(MAP_VERSION),
  id: IdSchema,
  electionId: IdSchema,
  profileId: IdSchema,
  authorLabel: z.string().trim().max(100).optional(),
  sources: z.array(SourceSchema).max(200),
  contests: z.array(ContestMappingSchema).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TopicContributionSchema = z.object({
  topicId: IdSchema,
  voterStars: StarsSchema,
  optionStars: StarsSchema,
  confidence: ConfidenceSchema,
  weightedContribution: z.number(),
});

export const OptionScoreSchema = z.object({
  optionId: IdSchema,
  score: z.number().min(0).max(5),
  coverage: z.number().min(0).max(1),
  contributions: z.array(TopicContributionSchema),
});

export const FptpMarkSchema = z.object({ method: z.literal('fptp'), selectedOptionIds: z.array(IdSchema).max(1) });
export const ChooseUpToMarkSchema = z.object({ method: z.literal('choose-up-to'), selectedOptionIds: z.array(IdSchema).max(20) });
export const RcvMarkSchema = z.object({ method: z.literal('rcv'), rankedOptionIds: z.array(IdSchema).max(30) });
export const StarMarkSchema = z.object({ method: z.literal('star'), scores: z.record(IdSchema, StarsSchema) });
export const YesNoMarkSchema = z.object({ method: z.literal('yes-no'), position: z.enum(['yes', 'no', 'abstain']) });

export const BallotMarkSchema = z.discriminatedUnion('method', [
  FptpMarkSchema,
  ChooseUpToMarkSchema,
  RcvMarkSchema,
  StarMarkSchema,
  YesNoMarkSchema,
]);

export const ContestDraftSchema = z.object({
  contestId: IdSchema,
  status: z.enum(['ready', 'research-needed', 'close-call']),
  optionScores: z.array(OptionScoreSchema),
  translated: BallotMarkSchema.nullable(),
  explanation: z.string(),
  warnings: z.array(z.string()),
});

export const DraftBallotSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  algorithmVersion: z.literal(ALGORITHM_VERSION),
  profileId: IdSchema,
  electionId: IdSchema,
  mappingId: IdSchema,
  contests: z.array(ContestDraftSchema),
  generatedAt: z.string().datetime(),
});

export const ContestDecisionSchema = z.object({
  contestId: IdSchema,
  confirmed: z.boolean(),
  override: BallotMarkSchema.nullable(),
  personalNote: z.string().trim().max(2000),
});

export const ElectionWorkspaceSchema = z.object({
  id: IdSchema,
  election: ElectionTemplateSchema,
  mapping: ElectionMapSchema,
  draft: DraftBallotSchema,
  decisions: z.array(ContestDecisionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((workspace, context) => {
  if (workspace.mapping.electionId !== workspace.election.id || workspace.draft.electionId !== workspace.election.id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['election'], message: 'Election, mapping, and draft ids must agree.' });
  if (workspace.mapping.profileId !== workspace.draft.profileId || workspace.mapping.id !== workspace.draft.mappingId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['mapping'], message: 'Profile and mapping references must agree with the generated draft.' });
  const contests = new Map(workspace.election.contests.map((contest) => [contest.id, contest]));
  const decisionIds = new Set<string>();
  workspace.decisions.forEach((decision, index) => {
    const contest = contests.get(decision.contestId);
    if (!contest || decisionIds.has(decision.contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'contestId'], message: 'Decisions must refer uniquely to an election contest.' });
    if (decision.override && contest && decision.override.method !== contest.method) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'override'], message: 'An override must use the contest voting method.' });
    decisionIds.add(decision.contestId);
  });
  for (const contest of workspace.election.contests) if (!decisionIds.has(contest.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions'], message: `Contest “${contest.id}” needs a human decision record.` });
});

export const GuideLineageSchema = z.object({
  parentSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  parentAuthorLabel: z.string().trim().max(100).optional(),
  changesFromParent: z.array(z.string()).max(100),
});

export const PeerGuideSchema = z.object({
  version: z.literal(GUIDE_VERSION),
  id: IdSchema,
  authorLabel: z.string().trim().min(1).max(100),
  profile: TopicProfileSchema,
  election: ElectionTemplateSchema,
  mapping: ElectionMapSchema,
  draft: DraftBallotSchema,
  decisions: z.array(ContestDecisionSchema),
  lineage: GuideLineageSchema,
  createdAt: z.string().datetime(),
  snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((guide, context) => {
  if (guide.mapping.profileId !== guide.profile.id || guide.draft.profileId !== guide.profile.id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['profile'], message: 'Snapshot profile references must agree.' });
  if (guide.mapping.electionId !== guide.election.id || guide.draft.electionId !== guide.election.id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['election'], message: 'Snapshot election references must agree.' });
  const contests = new Map(guide.election.contests.map((contest) => [contest.id, contest]));
  const decisionIds = new Set<string>();
  guide.decisions.forEach((decision, index) => {
    const contest = contests.get(decision.contestId);
    if (!contest || decisionIds.has(decision.contestId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'contestId'], message: 'Snapshot decisions must refer uniquely to an election contest.' });
    if (decision.override && contest && decision.override.method !== contest.method) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions', index, 'override'], message: 'An override must use the contest voting method.' });
    decisionIds.add(decision.contestId);
  });
  for (const contest of guide.election.contests) if (!decisionIds.has(contest.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisions'], message: `Contest “${contest.id}” needs a human decision record.` });
});

export type Source = z.infer<typeof SourceSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type TopicProfile = z.infer<typeof TopicProfileSchema>;
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

export function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}
