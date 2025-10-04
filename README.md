# Voting Topics Builder

Voting Topics Builder is an open-source workspace for capturing your political priorities, rating the outcomes you want, and turning them into a sharable STAR Voting ballot. The app keeps preferences portable (JSON, PDF, JPEG), privacy-first (local storage by default), and collaborative (share links and forkable templates).

## Why it exists
- **Outcome-first conversations** – record the results you want (“directions”) before arguing policies.
- **Guided onboarding** – welcome tour, hints, and next-step prompts help new visitors know what to do.
- **Starter pack + BYO AI** – pull in curated topics or hand the schema to your favourite LLM.
- **STAR Voting ballots** – score every candidate 0–5, export, and share.

## Quick start for developers

| Step | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Start dev server (Vite) | `npm run dev` |
| Run unit tests (Vitest) | `npm test` |
| Type-check & build | `npm run build` |

The development server runs at `http://localhost:5173/` with hot module reload. Tests live under `src/__tests__` and run with Vitest + jsdom.

## Repository tour

| Path | What lives here |
| --- | --- |
| `src/components/` | React components (cards, toolbar, onboarding modal, ballot builder, etc.) |
| `src/store.ts` | Zustand store: topics, hints, and STAR ballot state |
| `src/schema.ts` | Zod schemas for preference sets and ballots (`tsb.v1` & `tsb.ballot.v1`) |
| `starter-pack.*.json` | Curated starter topics & directions distributed with the app |
| `politician-pref-sets/` | Example preference sets for elected officials (used in demos/tests) |
| `scripts/` | Utility scripts (starter pack tooling, migrations) |
| `docs/` | Supplemental documentation referenced from the README and wiki |

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for a deeper walkthrough of major modules.

## Working with preference sets

1. **Topics** – add issues that matter to you. Each topic can reference related topics (SKOS style) and collects multiple directions.
2. **Directions** – describe the outcomes you want. Rate each one 0–5 stars (0 = skip for now). The `Stars` component stores the rating in the `Topic` schema.
3. **Sharing** – the app keeps the URL hash (`#sp2=...`) in sync with your data. Use the toolbar menu → “Share / Export” for JSON, PDF, or JPEG.
4. **Starter pack** – `StarterPackPicker` offers curated directions. Clear the list from the toolbar if you want to start fresh.

## Building STAR Voting ballots

- Open the ballot builder (`More → Ballot` or the mobile CTA) to enter election info.
- Add offices and candidates. Each candidate now has a 0–5 **STAR score**; the highest score is highlighted automatically.
- Link reasoning back to your topics/directions via the reasoning linker.
- Measures support Yes/No/Abstain positions with optional notes.
- Exports (`exporters.ts`) include JSON, PDF, and JPEG social cards. The readiness helpers require every office to have at least one scored candidate and every measure to have a position before “Share” unlocks.

## Contributing & community pathways

We welcome pull requests, issue reports, and documentation updates.

- **Starter pack adjustments** – open an issue describing the change, or submit a PR editing the relevant JSON. Include sources where possible.
- **Bug reports / enhancements** – file an issue with reproduction steps, screenshots, and environment details. Labels (`bug`, `ui`, `enhancement`, etc.) keep triage fast.
- **Wiki & documentation** – propose structural updates in the [GitHub wiki](https://github.com/uncomposed/voting-topics/wiki) or by editing files in `docs/`.
- **Code contributions** – see [CONTRIBUTING.md](Contributing.md) for project conventions (linting, tests, commit style, and release cadence).

If you are exploring integrations (LLM prompts, external data sync, etc.), check the existing issues tagged `spec`, `backend`, or `topics` to avoid duplication.

## Support & contact

- **Quick feedback?** Open a [GitHub Discussion](https://github.com/uncomposed/voting-topics/discussions) or issue.
- **Security / privacy questions?** Email the maintainers listed in `CONTRIBUTING.md`.
- **Want to demo the workflow?** Run `npm run dev`, visit the welcome tour (Toolbar → “Show Welcome Tour”), and follow the prompts.

Happy building!
