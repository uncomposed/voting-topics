# Portable artifacts, proposals, and deterministic calculation

Executable Zod contracts live in `src/domain/schema.ts`; generated JSON Schemas live in `public/schemas/`. `npm run check:schemas` fails when the checked-in schemas drift. Unknown versions, unsupported methods, stale task digests, unknown references, damaged guide digests, non-HTTP(S) URLs, and malformed payloads are rejected before accepted local state changes.

## Durable artifacts

### `vt.priority-menu.v1`

A versioned catalog of concrete, directional, solution-agnostic outcome statements. Its 22 categories organize browsing only. A profile copies the selected wording and menu revision, so later catalog changes never silently rewrite a user’s priorities.

### `vt.topic-profile.v3`

A reusable profile contains stable priorities, explicit Unrated (`null`) or 0–5 importance, optional category/notes/sources, authorship, and optional menu origin. Unrated means “selected, but not yet decided” and blocks progression into election research. Zero means “keep this in my profile, but do not let it influence calculations.” Existing v1/v2 numeric ratings migrate unchanged; migration never converts a missing decision to zero.

Changing priority wording invalidates linked assessments. Changing only category or stars preserves evidence; stars immediately recompute affected drafts.

### `vt.election-template.v3`

A user-owned election carries official sources, verification state, fork/import lineage, structured options, ballot instructions, and exactly one supported method per contest:

- `fptp`;
- `choose-up-to` with `maxSelections`;
- `rcv` with `maxRankings`;
- `star`;
- `yes-no` with option ids `yes` and `no`.

Unsupported methods fail validation. Method, method-limit, or option changes invalidate only that contest’s mapping, draft, and confirmation. A shared guide requires every contest to be human-verified against an official source.

### `vt.election-map.v2`

For each contest the author selects only materially relevant profile priorities. Every viable option/relevant-priority pair must be either:

- assessed 0–5 with confidence, a concise reason, at least one cited source, authorship, and human verification; or
- explicit `unknown`, meaning adequate evidence was not found.

Zero is evidenced strong conflict. Unknown and a missing cell never become zero or neutral. Chatbot-proposed claims retain chatbot task provenance after human verification; direct claims remain human-authored.

### `vt.peer-guide.v3`

An immutable guide includes the relevant profile subset, election, evidence map, algorithm and draft, human decisions, provenance, verification, author/timestamps, lineage, and digest. A peer can import its election alone or create an independent complete copy.

- URL prefix: `#guide=p3.`; valid legacy `p1` and previous `p2` links remain readable and are upgraded only after their original digest is verified.
- Representative target: below 4,000 URL characters.
- Hard limit: 6,000 characters, with JSON fallback.
- Maximum decompressed payload: 200 KB.

Oversize, corruption, digest mismatch, and unknown versions never alter local work. If realistic pilot links cannot retain evidence within the target, stop and evaluate immutable short-link storage.

## Task-scoped chatbot protocol

`vt.handoff-task.v1` contains a task id, digest of the exact scoped inputs, instructions, expected response version, context, and valid example. A task contains only what that step needs.

| Task | Accepted response |
| --- | --- |
| Priority discussion | `vt.priority-proposal.v1` |
| Election research | `vt.election-proposal.v1` |
| Contest relevance | `vt.relevance-proposal.v1` |
| One-contest evidence research | `vt.assessment-batch.v1` |
| Draft review | `vt.review-proposal.v1` |

The parser accepts one plain JSON object or one unambiguous fenced JSON block. Multiple blocks, stale digests, changed task ids, unknown ids, missing assessment pairs, hallucinated options, changed existing election ids, and out-of-scope menu choices produce a repair brief. Valid proposals remain staged until the user selects and accepts verified changes. Review proposals can add accepted notes, but a suggested override never changes a ballot mark automatically.

## Scoring and readiness

For voter importance `p`, option fit `m`, and confidence weight `w` (`low=.5`, `medium=.75`, `high=1`):

```text
option score = Σ(p × m × w) / Σ(p × w)
coverage     = Σ(p × w for assessed priorities) / Σ(p for all relevant priorities)
```

Unrated and zero-importance priorities do not contribute. Unrated priorities are also rejected from contest relevance. Full precision is retained and the UI displays one decimal. Every viable option needs at least 60% weighted coverage before an automatic recommendation. A margin below 0.25 at a selection or ranking boundary is a close call requiring explicit human resolution. A guide may still be shared with Unknown cells, low coverage, or a human override only after prominent amber warnings are acknowledged; those warnings remain visible to peers.

The method adapter generates one FPTP mark, top-N choose-up-to marks, an RCV order up to `maxRankings`, rounded official STAR scores, or Yes/No/Abstain. STAR output does not claim a meaningful single-voter runoff result.

## Persistence and migration

The normalized library uses `vt.topic-profiles.v3`, `vt.elections.v3`, `vt.ballot-workspaces.v2`, and `vt.peer-guides.v3`, with independent archive lists and rolling backups. Existing v2 profile and guide keys remain untouched. On first load, verified copies are written to the v3 keys; old bytes are not overwritten or deleted. All direct and imported mutations use the same recomputation and invalidation commands.

Legacy `tsb.v0`, `tsb.v1`, and `tsb.v2` data receives an exact raw download plus a conversion preview. Old category importance is reported but never compounded with item stars. Corrected-prototype embedded-election workspaces receive a separate profile/election/workspace preview. Acceptance copies the complete preview atomically; failure or cancellation changes nothing and original keys remain untouched.

See `docs/examples/` for small valid objects and `public/schemas/` for complete machine-readable contracts.
