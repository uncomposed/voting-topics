# Corrected Gate 1 user flows

## Politically activated friend

1. **Capture:** Maintain reusable, STAR-rated topic outcomes. Categories only organize the screen.
2. **Election:** Manually create or import the election, options, and actual voting methods.
3. **Map:** Select relevant topics per contest, then complete every option/topic cell with a cited 0–5 fit or Unknown.
4. **Generate:** Inspect option STAR scores, confidence-weighted coverage, strongest contributions, missing research, close calls, and the actual-method ballot draft.
5. **Review:** Correct topic priority, correct evidence mapping, or make an explicit contest-only override. Add a personal note separately from the deterministic explanation.
6. **Share:** Confirm every contest, then create an immutable link, export JSON, or print/save PDF.

## Peer

1. Open a read-only snapshot without an account or profile.
2. Inspect final marks, underlying STAR scores, coverage, contributions, cited reasons, sources, method translation, and human overrides.
3. Choose **Make my copy**. Existing local work is preserved; the copy gets new local ids, loses the shared hash, and retains the parent snapshot for comparison.
4. Change topic stars, add a topic, correct cited mapping evidence, or override a contest. A new topic has no contest effect until it is mapped.
5. Regenerate and inspect the semantic diff across topic ratings, mappings, scores, translated ballot, overrides, and explanations.
6. Confirm and reshare a new immutable snapshot with parent digest, author label, and change summary.

There is no canonical group map and no shared mutable prioritization. Every fork is independently owned.

## Legacy owner

1. Download exact raw `vt.m2` data at any time.
2. Preview v0/v1/v2 conversion before state changes.
3. Inspect converted topic stars, category metadata, specificity warnings, and discarded old category importance.
4. Cancel with no changes, or accept a new `vt.topic-profile.v1` while keeping the original bytes.

## Failure behavior

- Missing evidence is Unknown, never zero.
- Incomplete grids or any option below 60% coverage block automatic generation, but an explicitly reviewed manual recommendation remains possible and labeled insufficient evidence.
- Topic wording changes invalidate linked assessments; category-only changes do not.
- Contest method/option changes invalidate only that contest.
- Invalid election JSON, guide JSON, or snapshot links are parsed before mutation and leave existing work unchanged.
- Clipboard failure leaves a selectable link; oversize links require JSON fallback.
