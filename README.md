# Voting Topics — first-class voter-guide studio

Voting Topics helps the politically activated friend build reusable STAR-rated priorities, define an election they own, research how every viable option fits those priorities, and generate a sample ballot in the voting method that contest actually uses. They can share an evidence-backed guide that peers inspect, copy, change, regenerate, compare, and reshare independently.

The entire workflow works inside Voting Topics:

1. **Priorities:** search a versioned menu of specific civic outcomes, add custom outcomes, and rate their importance from 0–5.
2. **Election:** create, import, verify, fork, and export a user-owned election covering FPTP, choose-up-to-N, RCV/IRV, STAR, and Yes/No.
3. **Pair & research:** select materially relevant priorities, then assess every option/priority pair with cited 0–5 fit evidence or explicit Unknown.
4. **Draft & review:** inspect deterministic scores, evidence coverage, voting-method translation, close calls, provenance, and human overrides.
5. **Share:** export a profile or election, or publish an immutable guide for the peer loop.

Each work step also has an optional **Work with a chatbot** drawer. It creates a task-scoped brief for any chatbot and validates the returned proposal. Nothing is sent automatically, no vendor is required, and no proposal affects calculations until the user previews and accepts verified items. Removing these drawers leaves a complete product.

The bundled demonstration is fictional and is not voting advice.

## Run locally

Node 20 is supported.

```bash
npm ci
npm run dev
```

Open the URL Vite prints, normally `http://localhost:3000`. Run the release checks with:

```bash
npm run lint
npm run test:run
npm run check:schemas
npm run test:e2e
npm run build
npm run check:bundle
```

Playwright covers the direct and optional-chatbot paths, peer copying, desktop/mobile layouts, serious/critical Axe findings, damaged inputs, and legacy recovery.

## Privacy, ownership, and portability

- Profiles, elections, paired workspaces, and snapshots are separate local artifacts under new versioned keys. A rolling backup is retained before replacements.
- Elections belong to users. They can be exported to GitHub or another public HTTPS host and imported by URL; Voting Topics does not maintain a canonical election database.
- Remote files and chatbot responses are untrusted, size-limited, validated, and previewed before storage.
- Existing `vt.m2`, corrected-prototype, and `vt.guide.v1` bytes are never rewritten. Accepted conversions copy data into the new library; cancellation and failure change nothing.
- Peer guides are canonicalized, SHA-256 digested, gzip-compressed, base64url encoded, and stored after `#guide=p3.`. Valid `p1` and `p2` snapshots still open and are upgraded in memory.
- A link recipient can read everything in the snapshot. URL fragments normally are not sent to the web server, but they are not a secrecy boundary.

## Repository map

| Path | Responsibility |
| --- | --- |
| `PRODUCT.md` | Actors, product loop, direct-interface rule, boundaries, and stopping rules |
| `docs/decisions/002-first-class-studio-optional-chatbots.md` | Why the interface is primary and chatbot handoffs are optional |
| `docs/priority-menu-audit.md` | Editorial acceptance, omission, and change policy for the historical menu |
| `docs/mvp-pilot.md` | Creator/peer pilot protocol, evidence table, and deployment decision record |
| `src/domain/schema.ts` | Executable, versioned artifact and proposal contracts |
| `public/schemas/` | Generated portable JSON Schemas; CI rejects drift |
| `src/domain/scoring.ts` | Sparse-map audit, confidence/coverage formula, and method translation |
| `src/domain/handoff.ts` | Scoped tasks, strict response parsing, repair briefs, and reference checks |
| `src/domain/import.ts` | Paste/file/public URL imports and GitHub/Gist URL normalization |
| `src/domain/migration.ts` | Preview-only legacy and corrected-prototype conversion |
| `src/domain/share.ts` | Canonical digests and compressed immutable snapshots |
| `src/domain/store.ts` | Normalized artifact library, shared commands, invalidation, and atomic acceptance |
| `src/features/` | First-class activated-friend and peer workflow surfaces |
| `e2e/` | Desktop/mobile stakeholder-loop and accessibility evidence |

Historical implementations remain at `archive/pre-trusted-guide-pivot`, `archive/hand-authored-guide-experiment`, and `archive/reusable-peer-ballot-prototype`. They are evidence about product intent, not feature sets to restore.
