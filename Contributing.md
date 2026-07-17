# Contributing

Start with [PRODUCT.md](PRODUCT.md). This project is validating a reusable peer sample-ballot mechanism, not accumulating a general-purpose political workspace. The trusted guide is the output; reusable topics and evidence mappings are the domain model.

## Before implementing

Every proposal should state:

- which transition it advances: Capture, Map, Generate, Review, Share, Inspect, Change, Regenerate, or Reshare;
- the user-visible failure it addresses;
- the smallest end-to-end observation that would prove the change works;
- what result would falsify its value or cause the work to stop;
- which Gate 1 non-goal might otherwise creep into the change.

If it advances none of those transitions, defer it. Test every recommendation against the politically activated friend and their independently forking peers—not an imagined generic voter or canonical group workspace.

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

- Parse imported or shared data with the Zod schemas in `src/domain/schema.ts` before use.
- Categories are presentation metadata only; topic importance and option fit are distinct 0–5 inputs.
- Every viable option/topic pair in a selected contest subset must be assessed from cited evidence or explicitly Unknown.
- Zero means evidenced conflict. Missing or Unknown evidence must never become zero or neutral.
- Keep full-precision deterministic scoring separate from method-specific ballot translation and human decisions.
- Invalid imports and review links must leave local state unchanged.
- Preserve one rolling backup before replacement and preserve the immutable parent snapshot for fork comparison.
- Never rewrite or delete `vt.m2`; conversion must be previewed and create separate state only after acceptance.
- Shared snapshots are read-only until the peer explicitly makes an independent copy.
- Keep the fictional disclaimer visible anywhere the demo guide appears.

## Review audit

Reviewers should compare the proposed behavior with the simplest alternative, check for omitted desktop/mobile/error states, and identify the old failure mode the change prevents. A rendering screenshot or a unit test alone does not establish completion when the feature is a user flow.
