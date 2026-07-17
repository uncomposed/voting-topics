# Reusable Peer Sample Ballot Product Constitution

## Mission

Voting Topics helps the politically activated friend in a social group turn reusable, STAR-rated topics and election research into an explainable draft ballot, then lets peers inspect, fork, change, regenerate, and reshare it.

The trusted voter guide is the understandable output of that mechanism. It is not a replacement for the reusable topic profile or the candidate-to-topic mapping that makes the ballot useful across elections and peers.

## Primary actors

- **Politically activated friend:** maintains their own topic priorities, researches an election, maps candidates or ballot options to relevant topics, reviews the generated ballot, and shares it with peers who trust their judgment.
- **Peer:** opens the guide without setup, inspects the reasoning and evidence, and may create an independent fork with different topic priorities, mappings, or final choices.

These are fluid roles. A peer may reshare a fork and become the activated friend for another circle. There is no canonical group profile or shared mutable mapping.

## Required loop

Every active product change must improve at least one transition in this loop without breaking another:

1. **Capture** specific, directional, solution-agnostic topics and rate their importance from 0–5.
2. **Map** the relevant topics to every viable option in a contest with sparse, sourced 0–5 assessments or explicit Unknown states.
3. **Generate** deterministic option scores and translate them into the contest's actual voting method.
4. **Review** the draft, its evidence coverage, close calls, and human overrides.
5. **Share** a reproducible, immutable snapshot with no server-side guide storage.
6. **Inspect** recommendations, STAR scores, contributions, sources, uncertainty, and overrides without setup.
7. **Change** an independent fork at the topic, mapping, or contest-override layer.
8. **Regenerate and reshare** with a semantic diff and parent lineage.

## Topic contract

A topic states a concrete civic outcome someone cares about without prescribing a candidate, bill, or policy solution. “More homes affordable to local workers” is a topic; “Housing” is too broad and “Pass ordinance 123” is a solution.

Categories are optional UI grouping only. They never carry importance, participate in scoring, or invalidate election research when renamed.

## Corrected Gate 1 boundaries

Gate 1 includes reusable topic profiles, non-destructive legacy conversion, manual/JSON election setup, FPTP, choose-up-to-N, RCV/IRV, STAR, Yes/No measures, sparse evidence-backed option mappings, deterministic scoring, method-specific drafts, human confirmation and overrides, self-contained review links, peer inspection, independent forks, semantic diffs, JSON portability, and print-to-PDF.

Gate 1 does not include real-election APIs, accounts, server-side guide storage, a canonical mapping database, a shared group profile, multi-voter STAR tabulation, AI generation, the old cards/list/comparison workspace, politician-profile libraries, or mandatory onboarding.

## Evidence and stopping rules

- One profile must work across two election templates without re-entering topics.
- The same inputs must always generate the same scores and ballot translation.
- Every non-Unknown mapping claim must be traceable to a reason and HTTP(S) source.
- A peer must be able to explain why a recommendation changed after changing one topic rating.
- Invalid imports or links must never alter local work; `vt.m2` must remain byte-for-byte unchanged.
- A feature is incomplete until its activated-friend and peer behaviors pass end-to-end on desktop and mobile.
- If representative reproducible links exceed the size budget or fail in a pilot, pause and evaluate immutable short-link storage rather than dropping evidence.
- If mapping effort becomes excessive, simplify the mapping interaction—not the reusable profile or audit trail.
