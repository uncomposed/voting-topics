# ADR 001: Restore the reusable peer-ballot mechanism

- **Status:** Accepted
- **Date:** 2026-07-12
- **Historical anchors:** `archive/pre-trusted-guide-pivot`, `archive/hand-authored-guide-experiment`

## Context

The pre-pivot application contained reusable preference sets, STAR-rated directions, sample ballots, and reasoning links, but its core transition was unfinished: candidate scores and final choices were still mostly manual. The surrounding workspace accumulated duplicate views, comparisons, onboarding, LLM tooling, large politician datasets, and brittle state.

The first Trusted Voter Guide pivot removed that complexity by replacing the active product with a hand-authored five-contest guide. In doing so, commit `a517a77` also removed the project's distinguishing intent: capture priorities once, map election options to them, and generate a reusable draft sample ballot. Desired outcomes survived only as unweighted annotations added after a manual recommendation.

## Decision

Keep the lean local-first review, sharing, copying, accessibility, and delivery work, but restore a narrower reusable mechanism:

1. The activated friend maintains a reusable profile of specific, solution-agnostic topics rated 0–5.
2. For each contest they select relevant topics and rate every option/topic pair 0–5 from cited evidence or mark it Unknown.
3. A pure deterministic engine produces 0–5 option scores and translates them into the election's actual ballot method.
4. The friend confirms or overrides the draft and shares a reproducible snapshot.
5. Peers inspect and independently fork the snapshot; there is no canonical group profile or shared mutable mapping.

Categories are presentation metadata only. The application will not restore the old topic-card workspace, arbitrary comparison tools, LLM integration, politician library, or onboarding layers.

## Consequences

- The guide becomes an auditable output rather than the source of truth.
- Voter topic importance and candidate/option fit both use 0–5 stars, with distinct labels and Unknown separate from zero.
- STAR scores remain visible even when the official contest uses FPTP or RCV; a method adapter produces the actual marked ballot.
- Existing `vt.m2` data receives a previewed conversion while the original is preserved exactly.
- Self-contained links carry only the relevant topic subset, mappings, calculation, overrides, and sources needed to inspect and fork the guide.
- The repository history intentionally retains both the pre-pivot implementation and the misframed hand-authored experiment so future simplification does not repeat this domain deletion.
