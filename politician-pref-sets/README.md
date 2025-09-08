This folder holds JSON preference sets for public figures/candidates.

Guidelines:

- File format: export from the app (version: tsb.v1).
- Naming: `<year>-<race>-<candidate>.json` (e.g., `2024-presidential-smith.json`).
- Scope: stick to the starter-pack topics/directions where possible to keep shared links compact (sp2).
- Provenance: add a top-level `notes` field with sources and assumptions.

Workflow and bundling:

- The web app only consumes `library.index.json` at build-time. This compact file holds just star values by id and is used to synthesize full preference sets in the browser. It keeps bundles small.
- Bulky, expanded JSON files under `politician-json/` are NOT imported by the app and are therefore not bundled. You may keep them here for collaboration and review without affecting user download size.
- To update the compact index from expanded JSONs, run: `npm run library:build`
- To expand a compact index into individual JSONs, run: `npm run library:expand`

These sources can also be loaded in Compare via “Load from URL” if you host the JSON elsewhere.

Commands

- Build index from expanded sets:
  - `npm run library:build`
  - Reads `politician-pref-sets/politician-json/*.json` and writes `politician-pref-sets/library.index.json` with only non‑zero stars.

- Expand index to expanded sets:
  - `npm run library:expand`
  - Reads `politician-pref-sets/library.index.json` and `starter-pack.v2.4.json`, writes individual v1 preference sets to `politician-pref-sets/politician-json/`.

Environment vars (optional):

- `LIB_SRC` (override source dir for build step)
- `LIBRARY_INDEX` (override index path for both scripts)
- `STARTER` (override starter pack path for expand step)
- `OUTDIR` (override expanded output dir for expand step)
