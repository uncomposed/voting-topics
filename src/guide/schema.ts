import { z } from 'zod';

export const TEMPLATE_VERSION = 'vt.election-template.v1' as const;
export const GUIDE_VERSION = 'vt.guide.v1' as const;

const IdSchema = z.string().trim().min(1).max(120);
const ShortTextSchema = z.string().trim().min(1).max(180);

export const CandidateSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  party: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
});

export const CandidateContestSchema = z.object({
  id: IdSchema,
  kind: z.literal('candidate'),
  title: ShortTextSchema,
  description: z.string().trim().max(800).optional(),
  selectionRule: z.enum(['choose-one', 'choose-up-to']),
  maxSelections: z.number().int().min(1).max(10),
  candidates: z.array(CandidateSchema).min(2).max(20),
});

export const MeasureContestSchema = z.object({
  id: IdSchema,
  kind: z.literal('measure'),
  title: ShortTextSchema,
  description: z.string().trim().max(1200).optional(),
});

export const ContestSchema = z.discriminatedUnion('kind', [
  CandidateContestSchema,
  MeasureContestSchema,
]);

export const ElectionTemplateSchema = z
  .object({
    version: z.literal(TEMPLATE_VERSION),
    id: IdSchema,
    title: ShortTextSchema,
    electionDate: z.string().date(),
    jurisdiction: ShortTextSchema,
    isFictional: z.boolean(),
    disclaimer: z.string().trim().min(1).max(500),
    contests: z.array(ContestSchema).min(1).max(50),
  })
  .superRefine((template, context) => {
    const contestIds = new Set<string>();
    template.contests.forEach((contest, contestIndex) => {
      if (contestIds.has(contest.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contests', contestIndex, 'id'],
          message: `Contest id “${contest.id}” is duplicated.`,
        });
      }
      contestIds.add(contest.id);

      if (contest.kind === 'candidate') {
        if (contest.selectionRule === 'choose-one' && contest.maxSelections !== 1) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contests', contestIndex, 'maxSelections'],
            message: 'A choose-one contest must allow exactly one selection.',
          });
        }
        const candidateIds = new Set<string>();
        contest.candidates.forEach((candidate, candidateIndex) => {
          if (candidateIds.has(candidate.id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['contests', contestIndex, 'candidates', candidateIndex, 'id'],
              message: `Candidate id “${candidate.id}” is duplicated in this contest.`,
            });
          }
          candidateIds.add(candidate.id);
        });
      }
    });
  });

export const SourceSchema = z.object({
  id: IdSchema,
  label: z.string().trim().min(1).max(140),
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
      message: 'Sources must use an http or https URL.',
    }),
});

const DraftSourceSchema = z.object({
  id: IdSchema,
  label: z.string().max(140),
  url: z.string().max(2000),
});

export const GuideValueSchema = z.object({
  id: IdSchema,
  text: z.string().trim().min(1).max(240),
});

export const CandidateRecommendationSchema = z.object({
  contestId: IdSchema,
  kind: z.literal('candidate'),
  candidateIds: z.array(IdSchema).max(10),
  rationale: z.string().max(3000),
  valueIds: z.array(IdSchema).max(20),
  sources: z.array(DraftSourceSchema).max(5),
  ratings: z.record(IdSchema, z.number().int().min(0).max(5)),
});

export const MeasureRecommendationSchema = z.object({
  contestId: IdSchema,
  kind: z.literal('measure'),
  position: z.enum(['yes', 'no', 'abstain']).nullable(),
  rationale: z.string().max(3000),
  valueIds: z.array(IdSchema).max(20),
  sources: z.array(DraftSourceSchema).max(5),
});

export const RecommendationSchema = z.discriminatedUnion('kind', [
  CandidateRecommendationSchema,
  MeasureRecommendationSchema,
]);

export const VoterGuideDraftSchema = z.object({
  version: z.literal(GUIDE_VERSION),
  id: IdSchema,
  title: z.string().max(180),
  authorLabel: z.string().trim().max(100).optional(),
  template: ElectionTemplateSchema,
  values: z.array(GuideValueSchema).max(100),
  recommendations: z.array(RecommendationSchema).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VoterGuidePublishedSchema = VoterGuideDraftSchema.superRefine(
  (guide, context) => {
    const valueIds = new Set(guide.values.map((value) => value.id));
    if (guide.title.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Add a guide title.',
      });
    }
    if (valueIds.size !== guide.values.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['values'],
        message: 'Desired outcome ids must be unique.',
      });
    }
    const recommendationsByContest = new Map(
      guide.recommendations.map((recommendation, index) => [
        recommendation.contestId,
        { recommendation, index },
      ]),
    );

    if (recommendationsByContest.size !== guide.recommendations.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recommendations'],
        message: 'Each contest must have exactly one recommendation.',
      });
    }

    guide.template.contests.forEach((contest) => {
      const match = recommendationsByContest.get(contest.id);
      if (!match) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recommendations'],
          message: `${contest.title}: add a recommendation.`,
        });
        return;
      }

      const { recommendation, index } = match;
      const path: (string | number)[] = ['recommendations', index];
      if (recommendation.kind !== contest.kind) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `${contest.title}: recommendation type does not match the contest.`,
        });
        return;
      }

      if (recommendation.kind === 'candidate' && contest.kind === 'candidate') {
        const allowedIds = new Set(contest.candidates.map((candidate) => candidate.id));
        const uniqueSelections = new Set(recommendation.candidateIds);
        const correctCount =
          contest.selectionRule === 'choose-one'
            ? uniqueSelections.size === 1
            : uniqueSelections.size >= 1 && uniqueSelections.size <= contest.maxSelections;
        if (!correctCount || uniqueSelections.size !== recommendation.candidateIds.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, 'candidateIds'],
            message: `${contest.title}: choose ${
              contest.selectionRule === 'choose-one'
                ? 'one candidate'
                : `one to ${contest.maxSelections} candidates`
            }.`,
          });
        }
        recommendation.candidateIds.forEach((candidateId) => {
          if (!allowedIds.has(candidateId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [...path, 'candidateIds'],
              message: `${contest.title}: a selected candidate is not in the election template.`,
            });
          }
        });
        Object.keys(recommendation.ratings).forEach((candidateId) => {
          if (!allowedIds.has(candidateId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [...path, 'ratings'],
              message: `${contest.title}: a rating refers to an unknown candidate.`,
            });
          }
        });
      }

      if (recommendation.kind === 'measure' && recommendation.position === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'position'],
          message: `${contest.title}: choose Yes, No, or Abstain.`,
        });
      }

      if (recommendation.rationale.trim().length < 20) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'rationale'],
          message: `${contest.title}: explain the recommendation in at least 20 characters.`,
        });
      }

      if (recommendation.valueIds.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'valueIds'],
          message: `${contest.title}: link at least one desired outcome.`,
        });
      }
      if (new Set(recommendation.valueIds).size !== recommendation.valueIds.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'valueIds'],
          message: `${contest.title}: each desired outcome may be linked only once.`,
        });
      }
      recommendation.valueIds.forEach((valueId) => {
        if (!valueIds.has(valueId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, 'valueIds'],
            message: `${contest.title}: a linked desired outcome no longer exists.`,
          });
        }
      });
      recommendation.sources.forEach((source, sourceIndex) => {
        const parsedSource = SourceSchema.safeParse(source);
        if (!parsedSource.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, 'sources', sourceIndex],
            message: `${contest.title}: complete or remove the invalid source.`,
          });
        }
      });
    });

    const contestIds = new Set(guide.template.contests.map((contest) => contest.id));
    guide.recommendations.forEach((recommendation, index) => {
      if (!contestIds.has(recommendation.contestId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recommendations', index, 'contestId'],
          message: 'A recommendation refers to a contest outside this election.',
        });
      }
    });
  },
);

export type Candidate = z.infer<typeof CandidateSchema>;
export type CandidateContest = z.infer<typeof CandidateContestSchema>;
export type MeasureContest = z.infer<typeof MeasureContestSchema>;
export type Contest = z.infer<typeof ContestSchema>;
export type ElectionTemplate = z.infer<typeof ElectionTemplateSchema>;
export type GuideSource = z.infer<typeof DraftSourceSchema>;
export type GuideValue = z.infer<typeof GuideValueSchema>;
export type CandidateRecommendation = z.infer<typeof CandidateRecommendationSchema>;
export type MeasureRecommendation = z.infer<typeof MeasureRecommendationSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type VoterGuideDraft = z.infer<typeof VoterGuideDraftSchema>;
export type VoterGuidePublished = z.infer<typeof VoterGuidePublishedSchema>;

export function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export function createGuideFromTemplate(templateInput: ElectionTemplate): VoterGuideDraft {
  const template = ElectionTemplateSchema.parse(templateInput);
  const now = new Date().toISOString();
  return {
    version: GUIDE_VERSION,
    id: newId('guide'),
    title: `My guide to ${template.title}`,
    template,
    values: [],
    recommendations: template.contests.map((contest) =>
      contest.kind === 'candidate'
        ? {
            contestId: contest.id,
            kind: 'candidate' as const,
            candidateIds: [],
            rationale: '',
            valueIds: [],
            sources: [],
            ratings: {},
          }
        : {
            contestId: contest.id,
            kind: 'measure' as const,
            position: null,
            rationale: '',
            valueIds: [],
            sources: [],
          },
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function guideReadinessMessages(guide: VoterGuideDraft): string[] {
  const result = VoterGuidePublishedSchema.safeParse(guide);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}

export function isContestComplete(guide: VoterGuideDraft, contestId: string): boolean {
  const contest = guide.template.contests.find((item) => item.id === contestId);
  const recommendation = guide.recommendations.find((item) => item.contestId === contestId);
  if (!contest || !recommendation || contest.kind !== recommendation.kind) return false;
  const hasChoice =
    recommendation.kind === 'candidate' && contest.kind === 'candidate'
      ? recommendation.candidateIds.length >= 1 &&
        recommendation.candidateIds.length <= contest.maxSelections
      : recommendation.kind === 'measure' && contest.kind === 'measure'
        ? recommendation.position !== null
        : false;
  return (
    hasChoice &&
    recommendation.rationale.trim().length >= 20 &&
    recommendation.valueIds.length >= 1 &&
    recommendation.sources.every((source) => SourceSchema.safeParse(source).success)
  );
}
