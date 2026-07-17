# Portable formats and deterministic calculation

The executable Zod contracts live in `src/domain/schema.ts`. Unknown versions, unsupported voting methods, damaged digests, non-HTTP(S) evidence URLs, and malformed references are rejected before local state changes.

## `vt.topic-profile.v1`

A reusable profile contains owner/title metadata and stable topics. Each topic has a specific outcome statement, 0–5 voter importance stars, and optional category, notes, and sources. A category is presentation metadata only and never enters a calculation.

Topic statements should be:

- **specific** enough to evaluate against an election option;
- **directional** about the outcome the person wants;
- **solution-agnostic**, so competing approaches can be rated against it.

Changing wording invalidates linked assessments until they are reconfirmed. Changing only category or importance does not invalidate research; importance changes recompute generated scores.

## `vt.election-template.v2`

An election embeds stable contest and option ids plus exactly one supported method:

- `fptp`;
- `choose-up-to` with `maxSelections`;
- `rcv` with `maxRankings`;
- `star`;
- `yes-no` with option ids `yes` and `no`.

Unsupported methods fail validation. Method, option, or method-limit changes invalidate that contest’s mapping, draft, and confirmation.

## `vt.election-map.v1`

The author selects only materially relevant profile topics per contest. Within that subset every viable option/topic pair must contain either:

- an assessed 0–5 fit, confidence, short reason, and at least one referenced HTTP(S) source; or
- explicit `unknown`, which means adequate evidence was not found.

Zero is an evidenced strong conflict. Unknown and a missing cell never become zero or neutral. Sources are stored once and referenced by id.

## Scoring and readiness

For voter stars `p`, option fit stars `m`, and confidence `w` (`low=.5`, `medium=.75`, `high=1`):

```text
option score = Σ(p × m × w) / Σ(p × w)
coverage     = Σ(p × w for assessed topics) / Σ(p for all relevant topics)
```

Zero-importance topics do not contribute. Full precision is retained and the UI displays one decimal. Every viable option needs at least 60% weighted coverage before an automatic recommendation. A margin below 0.25 at a selection or ranking boundary is a close call requiring explicit human resolution.

The method adapter generates one FPTP mark, top-N choose-up-to marks, a full-precision RCV order up to `maxRankings`, rounded official STAR scores, or Yes/No/Abstain. STAR output never claims a meaningful single-voter runoff result.

## `vt.peer-guide.v1`

An immutable snapshot carries only the relevant topic subset, election, deduplicated evidence map, algorithm version and draft, human decisions, author/timestamps, lineage, and SHA-256 digest. It is canonicalized, gzip-compressed, base64url-encoded, and placed after `#guide=p1.`.

- Representative target: below 4,000 URL characters.
- Hard limit: 6,000 characters, with JSON fallback.
- Maximum decompressed payload: 200 KB.
- Digest mismatch, oversize, corruption, or unknown versions never alter local state.

If realistic pilot links cannot stay under the target without dropping evidence, stop and evaluate immutable short-link storage.

See `docs/examples/` for small valid profile, election, and map objects.
