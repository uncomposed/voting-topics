# Gate 1 user flows

## Creator

1. Start the clearly fictional five-contest demo or import a validated election template.
2. Make an explicit candidate or measure recommendation for every contest.
3. Explain the recommendation and link at least one reusable desired-outcome statement.
4. Optionally record personal-fit ratings and sources. Ratings never select candidates.
5. Review only after every contest passes published-guide validation.
6. Copy a compressed private review link, export JSON, or print to PDF.

## Reviewing friend

1. Open a read-only review link.
2. See each recommendation before its rationale, desired outcomes, sources, and secondary ratings.
3. Choose **Make my copy** to confirm replacement, save an editable browser copy, and remove the shared hash from the address bar.

## Existing pre-pivot user

1. See that earlier `vt.m2` data still exists and is not compatible with the new guide model.
2. Download the exact raw value as a backup or dismiss the notice.
3. Start or import a guide under the separate `vt.guide.v1` key.

## Failure behavior

- A malformed or oversized share payload shows a clear error and cannot replace local state.
- A malformed import shows a clear error and cannot replace local state.
- An incomplete guide stays editable but cannot produce a review link.
- Clipboard failure exposes a selectable review-link field.
