# Pre-pivot baseline

Recorded before implementing the trusted voter-guide MVP.

## Repository state

- Archived experimental head: `c030e32` on `codex/public-beta-share-review`.
- Remote baseline: `588a1fb` on `origin/main`.
- The archived head contains four unpublished commits and a 49-file change surface relative to remote main.
- The source tree grew from 973 TypeScript/TSX/CSS lines on 2025-08-31 to roughly 16,700 at the archived head.

## Verification baseline

On the archived head with Node 20:

- 46 Vitest tests passed, with React `act` warnings in integration tests.
- Three Playwright tests passed.
- TypeScript and Vite production build passed.
- ESLint passed with five hook warnings.

Remote main's Playwright configuration did not start the application server. After Gate 0 added that precondition, both legacy end-to-end tests failed: the home page had two serious accessibility violations, and the compact-share test expected a prompt the app no longer displayed. Gate 0 records rather than repairs these retired-product failures. Gate 1 replaces the tests and makes end-to-end coverage mandatory before deployment.

## Product-flow defects reproduced in the running app

- “Next: Add Details in List View” advanced stored flow state but left the user in card view.
- “Export Preference Set” marked unrated work complete but invoked a missing export control.
- Desktop and mobile navigation independently derived readiness and next actions.

## Sharing constraint

The archived full-share encoder stored uncompressed JSON in a URL capped at 6,000 characters. Representative payloads measured:

- Five starter topics: approximately 7,856 characters.
- Five offices and three measures: approximately 6,344 characters.
- Deflating the five-topic payload reduced it to approximately 1,650 characters.

## Retired product surfaces

The archive tag preserves the preference editor, topic cards, starter packs, diff and heatmap comparison, politician profiles, AI integration, hints, onboarding, old ballot builder, migrations, Storybook starter content, and associated scripts and tests.

The active MVP will retain only behavior required to create, share, understand, and copy a trusted voter guide.
