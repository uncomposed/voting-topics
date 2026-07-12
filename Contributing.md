# Contributing

Start with [PRODUCT.md](PRODUCT.md). This project is trying to validate a trusted voter-guide workflow, not accumulate a general-purpose political workspace.

## Before implementing

Every proposal should state:

- which behavior it advances: Create, Share, Understand, or Copy;
- the user-visible failure it addresses;
- the smallest end-to-end observation that would prove the change works;
- what result would falsify its value or cause the work to stop;
- which Gate 1 non-goal might otherwise creep into the change.

If it advances none of the four behaviors, defer it. If a flow needs more explanation, first test whether a step or concept can be removed.

## Development workflow

Use Node 20 and install from the lockfile:

```bash
npm ci
npm run dev
```

Before opening a pull request, run the same gates as CI:

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run build
npm run check:bundle
```

Lint must produce zero warnings. Unit tests must not emit React `act(...)` warnings. The end-to-end suite must pass at both configured viewport sizes with no serious or critical Axe violations. Initial JavaScript must remain below 200 KB gzip.

## Domain and safety rules

- Parse all imported or shared data with the Zod schemas in `src/guide/schema.ts` before use.
- Draft validation may permit incomplete recommendations; published validation must require every contest, rationale, and desired outcome.
- Never let a rating implicitly select a candidate.
- Invalid imports and review links must leave local state unchanged.
- Replacements require confirmation and preserve one rolling backup.
- Never read, rewrite, or delete `vt.m2`; only offer its exact contents as a download.
- Shared reviews are read-only until the user explicitly makes a copy.
- Keep the fictional disclaimer visible anywhere the demo guide appears.

## Review audit

Reviewers should compare the proposed behavior with the simplest alternative, check for omitted desktop/mobile/error states, and identify the old failure mode the change prevents. A rendering screenshot or a unit test alone does not establish completion when the feature is a user flow.
