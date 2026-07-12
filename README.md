# Trusted Voter Guide

Trusted Voter Guide helps a politically engaged person make a transparent guide and share it privately so friends can understand, copy, and adapt the recommendations.

Gate 1 deliberately proves one narrow loop:

1. Create a complete five-contest guide from the fictional demo or an imported election template.
2. Share it as a compressed, read-only URL with no account or server-side guide storage.
3. Understand the explicit recommendation, rationale, desired outcomes, and optional sources.
4. Make a private editable copy without overwriting existing work silently.

The demo election and every person or proposal in it are fictional. This repository does not yet ship real election data or voting advice.

## Run it locally

Node 20 is the supported runtime.

```bash
npm ci
npm run dev
```

The development app runs at `http://localhost:3000`. To exercise the production quality gate:

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run build
npm run check:bundle
```

The Playwright suite runs at 1280×800 and 390×844. It covers completion, share/reopen, make-copy/reload, damaged input, legacy backup, and automated accessibility checks.

## Privacy and portability

- Draft state is stored only under `vt.guide.v1` in the current browser.
- Existing pre-pivot state under `vt.m2` is never migrated or changed. The home page offers its raw contents as a backup download.
- Review links store a gzip-compressed published guide after `#guide=g1.`. URL fragments are not sent in ordinary HTTP requests, but anyone who receives a link can read it.
- Complete guides can be exported as `vt.guide.v1` JSON or printed to PDF through the browser.
- A single rolling backup is retained before a guide is replaced by an import or shared copy.

## Repository map

| Path | Responsibility |
| --- | --- |
| `PRODUCT.md` | Mission, scope boundaries, evidence rules, and Gate 2 pilot thresholds |
| `src/guide/schema.ts` | Election-template, draft-guide, and published-guide contracts |
| `src/guide/store.ts` | Local persistence and rolling replacement backup |
| `src/guide/share.ts` | Compressed review-link encoding and validation |
| `src/App.tsx` | The home, creator, local review, and shared review routes |
| `e2e/` | User-behavior and accessibility evidence on desktop and mobile |
| `docs/formats.md` | JSON format and validation expectations |
| `docs/deploy-vps.md` | Atomic VPS deployment and rollback setup |

The full pre-pivot implementation remains available at the Git tag `archive/pre-trusted-guide-pivot`; it is intentionally not part of the active MVP build.

## Product decision rule

New work must improve Create, Share, Understand, or Copy and name the evidence that would prove it. Real election data, accounts, analytics, AI workflows, politician profiles, arbitrary comparisons, ranked-choice contests, and a visual template editor remain outside Gate 1. See [PRODUCT.md](PRODUCT.md) before proposing expansion.

## Contributing

See [Contributing.md](Contributing.md). Gate 1 work is tracked in the `Trusted Voter Guide — Gate 1` milestone; pre-pivot issues carry the `legacy-pre-pivot` label.
