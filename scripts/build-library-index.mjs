#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const root = path.resolve(repoRoot, '..');

const GLOB_DIR = process.env.LIB_SRC || path.join(root, 'politician-pref-sets', 'politician-json');
const OUT = process.env.LIBRARY_INDEX || path.join(root, 'politician-pref-sets', 'library.index.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const files = fs.existsSync(GLOB_DIR)
  ? fs.readdirSync(GLOB_DIR).filter(f => f.endsWith('.json')).map(f => path.join(GLOB_DIR, f))
  : [];

const candidates = [];
for (const file of files) {
  try {
    const data = readJson(file);
    if (data?.version !== 'tsb.v1' || !Array.isArray(data?.topics)) continue;
    const prefs = {};
    for (const t of data.topics) {
      if (!Array.isArray(t?.directions)) continue;
      for (const d of t.directions) {
        const stars = Number(d?.stars || 0);
        if (stars <= 0) continue; // keep compact: only non-zero
        if (!prefs[t.id]) prefs[t.id] = {};
        prefs[t.id][d.id] = stars;
      }
    }
    const id = path.basename(file).replace(/\.json$/, '');
    candidates.push({ id, title: data.title || id, prefs, notes: data.notes || '' });
  } catch (e) {
    console.warn('Skipping invalid JSON:', file);
  }
}

const index = { version: 'tsb.lib.v1', candidates };
fs.writeFileSync(OUT, JSON.stringify(index, null, 2));
console.log(`Wrote ${candidates.length} entries to ${OUT}`);

