import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Run the ESM scripts by spawning a Node process with env overrides
const runNode = (scriptPath: string, env: Record<string, string>) => {
  const { spawnSync } = require('node:child_process');
  const res = spawnSync(process.execPath, [scriptPath], { env: { ...process.env, ...env } });
  if (res.status !== 0) {
    throw new Error(`Script failed: ${scriptPath}\n${res.stderr?.toString?.()}`);
  }
};

describe('library scripts roundtrip', () => {
  it('expanded -> compact -> expanded preserves stars and topics', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-lib-'));
    const outdir = path.join(tmp, 'politician-json');
    fs.mkdirSync(outdir, { recursive: true });

    // Minimal starter with two topics/dirs
    const starter = {
      topics: [
        { id: 'topic-a', title: 'A', directions: [ { id: 'dir-a1', text: 'a1' }, { id: 'dir-a2', text: 'a2' } ] },
        { id: 'topic-b', title: 'B', directions: [ { id: 'dir-b1', text: 'b1' } ] }
      ]
    };
    const starterPath = path.join(tmp, 'starter.json');
    fs.writeFileSync(starterPath, JSON.stringify(starter));

    // One expanded set
    const expanded = {
      version: 'tsb.v1',
      title: 'Candidate X',
      notes: '',
      topics: [
        { id: 'topic-a', title: 'A', importance: 4, stance: 'neutral',
          directions: [ { id: 'dir-a1', text: 'a1', stars: 4, sources: [], tags: [] }, { id: 'dir-a2', text: 'a2', stars: 0, sources: [], tags: [] } ],
          notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
        { id: 'topic-b', title: 'B', importance: 3, stance: 'neutral',
          directions: [ { id: 'dir-b1', text: 'b1', stars: 3, sources: [], tags: [] } ],
          notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const expandedPath = path.join(outdir, 'candidate-x.json');
    fs.writeFileSync(expandedPath, JSON.stringify(expanded));

    const indexPath = path.join(tmp, 'library.index.json');

    // Build compact from expanded
    runNode(path.resolve('scripts/build-library-index.mjs'), {
      LIB_SRC: outdir,
      LIBRARY_INDEX: indexPath
    });

    // Read compact and sanity check structure
    const compact = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    expect(compact.version).toBe('tsb.lib.v1');
    expect(compact.candidates.length).toBe(1);
    expect(compact.candidates[0].prefs['topic-a']['dir-a1']).toBe(4);
    expect(compact.candidates[0].prefs['topic-b']['dir-b1']).toBe(3);
    // zero stars omitted in compact
    expect(compact.candidates[0].prefs['topic-a']['dir-a2']).toBeUndefined();

    // Expand compact back to expanded JSONs (in a new outdir)
    const outdir2 = path.join(tmp, 'expanded-out');
    fs.mkdirSync(outdir2, { recursive: true });
    runNode(path.resolve('scripts/expand-library-index.mjs'), {
      STARTER: starterPath,
      LIBRARY_INDEX: indexPath,
      OUTDIR: outdir2
    });

    const roundtrip = JSON.parse(fs.readFileSync(path.join(outdir2, 'candidate-x.json'), 'utf8'));
    const topicA = roundtrip.topics.find((t: any) => t.id === 'topic-a');
    const topicB = roundtrip.topics.find((t: any) => t.id === 'topic-b');
    expect(topicA.directions.find((d: any) => d.id === 'dir-a1').stars).toBe(4);
    expect(topicA.directions.find((d: any) => d.id === 'dir-a2').stars).toBe(0);
    expect(topicB.directions.find((d: any) => d.id === 'dir-b1').stars).toBe(3);
  });
});


