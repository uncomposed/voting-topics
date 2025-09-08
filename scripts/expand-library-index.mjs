#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const root = repoRoot; // use project root

const STARTER = process.env.STARTER || path.join(root, 'starter-pack.v2.4.json');
const INDEX = process.env.LIBRARY_INDEX || path.join(root, 'politician-pref-sets', 'library.index.json');
const OUTDIR = process.env.OUTDIR || path.join(root, 'politician-pref-sets', 'politician-json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const safe = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

const starter = readJson(STARTER);
const index = readJson(INDEX);
ensureDir(OUTDIR);

const spTopics = Array.isArray(starter.topics) ? starter.topics : [];

const buildSet = (title, prefs, notes='') => {
  const now = new Date().toISOString();
  const topics = spTopics.map(t => {
    const topicPrefs = (prefs && prefs[t.id]) || {};
    const directions = (t.directions || []).map(d => ({
      id: d.id,
      text: d.text,
      stars: Math.max(0, Math.min(5, Number(topicPrefs[d.id] || 0))),
      sources: [],
      tags: []
    }));
    const importance = directions.reduce((m, d) => Math.max(m, d.stars || 0), 0);
    return {
      id: t.id,
      title: t.title,
      importance,
      stance: 'neutral',
      directions,
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    };
  });
  return {
    version: 'tsb.v1',
    title,
    notes,
    topics,
    createdAt: now,
    updatedAt: now,
  };
};

const candidates = Array.isArray(index.candidates) ? index.candidates : [];
let count = 0;
for (const c of candidates) {
  const title = c.title || `${c.name || 'Candidate'} — ${c.year || ''} (${c.party || ''}) ${c.stage || ''}`.trim();
  const prefs = c.prefs || {};
  const notes = c.notes || '';
  const id = c.id || `${safe(c.name)}-${c.year}-${safe(c.stage)}`;
  const out = path.join(OUTDIR, `${id}.json`);
  const data = buildSet(title, prefs, notes);
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  count++;
}

console.log(`Expanded ${count} candidate sets to ${OUTDIR}`);

