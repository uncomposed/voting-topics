import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  AssessmentBatchSchema,
  ElectionProposalSchema,
  ElectionTemplateSchema,
  ElectionMapSchema,
  HandoffTaskSchema,
  PeerGuideSchema,
  PriorityMenuSchema,
  PriorityProposalSchema,
  RelevanceProposalSchema,
  ReviewProposalSchema,
  TopicProfileSchema,
} from '../src/domain/schema';

const schemas = {
  'priority-menu.v1': PriorityMenuSchema,
  'topic-profile.v3': TopicProfileSchema,
  'election-template.v3': ElectionTemplateSchema,
  'election-map.v2': ElectionMapSchema,
  'peer-guide.v3': PeerGuideSchema,
  'handoff-task.v1': HandoffTaskSchema,
  'priority-proposal.v1': PriorityProposalSchema,
  'election-proposal.v1': ElectionProposalSchema,
  'relevance-proposal.v1': RelevanceProposalSchema,
  'assessment-batch.v1': AssessmentBatchSchema,
  'review-proposal.v1': ReviewProposalSchema,
} as const;

const directory = resolve('public/schemas');
const check = process.argv.includes('--check');
await mkdir(directory, { recursive: true });

let drift = false;
for (const [name, schema] of Object.entries(schemas)) {
  const generated = `${JSON.stringify(zodToJsonSchema(schema, { name, $refStrategy: 'root' }), null, 2)}\n`;
  const filename = resolve(directory, `${name}.schema.json`);
  if (check) {
    const existing = await readFile(filename, 'utf8').catch(() => '');
    if (existing !== generated) {
      drift = true;
      console.error(`${name}.schema.json is out of date.`);
    }
  } else {
    await writeFile(filename, generated);
  }
}

if (drift) process.exitCode = 1;
