# Voting Topics — reusable peer sample ballot

Voting Topics helps the politically activated friend turn reusable topic priorities into an evidence-backed draft sample ballot, then share it with peers who can inspect, fork, change, regenerate, and reshare independently.

Gate 1 proves this loop:

1. Capture specific, directional, solution-agnostic topics and rate their importance 0–5.
2. Manually define an election and its real voting methods.
3. Select relevant topics per contest and rate every viable option/topic pair 0–5 from cited evidence or mark it Unknown.
4. Generate transparent option STAR scores and translate them into FPTP, choose-up-to-N, RCV/IRV, STAR, or Yes/No ballot marks.
5. Review, override, and publish an immutable, reproducible snapshot.
6. Let a peer inspect the evidence, make an independent copy, change it, see a semantic diff, and reshare it.

There is no shared mutable group profile, canonical candidate database, account, real-election API, or AI generation in Gate 1. The bundled demonstration is entirely fictional and is not voting advice.

## Run locally

Node 20 is supported.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Run the release gate with:

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run build
npm run check:bundle
```

Playwright runs the complete activated-friend and peer loop at 1280×800 and 390×844, including serious/critical Axe checks, damaged input, legacy conversion, and URL size.

## Privacy, persistence, and portability

- Reusable profiles live under `vt.topic-profile.v1`; election workspaces live separately under `vt.election-workspaces.v1`.
- One rolling pre-replacement backup is retained for each. A fork’s immutable parent snapshot is kept under `vt.peer-guide.parent.v1` for comparison.
- The old `vt.m2` bytes are never modified. Conversion is previewed first; cancel/failure changes nothing, and acceptance creates a new profile.
- The hand-authored experiment under `vt.guide.v1` remains downloadable but is not silently converted into evidence.
- Shared snapshots are canonicalized, SHA-256 digested, gzip-compressed, base64url encoded, and stored after `#guide=p1.`. The target is under 4,000 URL characters and the hard limit is 6,000.
- A link recipient can read everything in that snapshot. URL fragments are normally not sent to the web server, but they are not a secrecy boundary.

## Repository map

| Path | Responsibility |
| --- | --- |
| `PRODUCT.md` | Product constitution, actors, loop, boundaries, and stopping rules |
| `docs/decisions/001-reusable-peer-ballot.md` | Why the reusable mechanism was restored |
| `src/domain/schema.ts` | Versioned portable contracts |
| `src/domain/scoring.ts` | Sparse-map audit, confidence/coverage formula, method translation |
| `src/domain/migration.ts` | Preview-only v0/v1/v2 legacy conversion |
| `src/domain/share.ts` | Canonical digest and compressed snapshot links |
| `src/domain/diff.ts` | Peer-fork semantic comparison |
| `src/domain/store.ts` | Separate local profile/workspace persistence and invalidation |
| `src/features/` | Activated-friend and peer user-flow surfaces |
| `e2e/` | Desktop/mobile stakeholder-loop and accessibility evidence |
| `docs/formats.md` | Format and scoring reference |
| `docs/deploy-vps.md` | Manual atomic deployment and rollback |

Historical implementations remain at `archive/pre-trusted-guide-pivot` and `archive/hand-authored-guide-experiment`. Do not restore their topic-card workspace, comparisons, onboarding, LLM UI, politician library, or manual-guide domain model.
