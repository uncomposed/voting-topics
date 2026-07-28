# Voting Topics Product Constitution

## Mission

Voting Topics is a complete voter-guide studio for the politically activated friend in a social group. It helps them choose and STAR-rate reusable priorities, build or import an election they own, pair those priorities with contests, assess every viable option from cited evidence, generate the ballot that election actually accepts, and share an explainable guide that peers can inspect, fork, change, regenerate, and reshare.

The trusted voter guide is the understandable output of that mechanism. It is not a replacement for the reusable priority profile, user-owned election, or option-to-priority research that makes the ballot useful across elections and peers.

Every task must work well inside Voting Topics. A user may optionally coordinate with any chatbot by exporting a task-specific brief and importing a proposed payload. Chatbots can help the user think, research, and reduce repetitive entry, but they never provide a capability missing from the direct interface and their proposals never affect accepted work before human review.

## Primary actors

- **Politically activated friend:** maintains their own priority profile, creates or imports an election artifact, researches and verifies it, maps candidates or ballot options to relevant priorities, reviews the generated ballot, and shares it with peers who trust their judgment.
- **Peer:** opens the guide without setup, inspects the reasoning and evidence, and may create an independent fork with different topic priorities, mappings, or final choices.
- **Optional chatbot:** an untrusted, user-chosen collaborator that receives only a task-scoped export and returns a proposal for human verification. Voting Topics does not call or depend on a chatbot vendor.

These are fluid roles. A peer may reshare a fork and become the activated friend for another circle. There is no canonical group profile or shared mutable mapping.

## Required loop

Every active product change must improve at least one transition in this loop without breaking another:

1. **Choose priorities:** browse or search a versioned menu, add custom priorities, and STAR-rate specific, directional, solution-agnostic outcomes.
2. **Own the election:** create, import, verify, export, or fork the election artifact without relying on a Voting Topics election database.
3. **Pair and research:** select materially relevant priorities and assess every viable option with sparse, sourced 0–5 evidence or explicit Unknown states.
4. **Generate and review:** calculate deterministic option scores, translate them into the contest's actual voting method, resolve close calls, and record human overrides.
5. **Share:** publish a reproducible snapshot or portable profile/election artifact.
6. **Inspect, change, regenerate, and reshare:** let peers audit and independently fork the complete mechanism.

Every one of the first four steps offers the same optional handoff pattern: prepare a scoped brief, work with a chatbot, validate the returned proposal, preview its semantic changes, and accept only the claims the user verifies.

## Priority contract

A priority states a concrete civic outcome someone cares about without prescribing a candidate, bill, or policy solution. “More homes affordable to local workers” is a priority; “Housing” is too broad and “Pass ordinance 123” is a solution. The internal domain name remains `Topic` for compatibility.

Categories are optional UI grouping only. They never carry importance, participate in scoring, or invalidate election research when renamed.

## MVP boundaries

The MVP includes a versioned priority menu, reusable profiles, a local artifact library, excellent direct election and research interfaces, portable user-owned elections, FPTP, choose-up-to-N, RCV/IRV, STAR, Yes/No measures, sparse evidence-backed option mappings, deterministic scoring, method-specific drafts, human verification and overrides, self-contained review links, independent peer forks, semantic diffs, JSON portability, print-to-PDF, and task-specific chatbot handoffs.

The MVP does not include real-election APIs, accounts, server-side guide storage, a canonical election or mapping database, a shared group profile, multi-voter STAR tabulation, embedded or vendor-specific AI, the old comparison workspace, politician-profile libraries, or mandatory onboarding.

## Evidence and stopping rules

- One profile must work across two election templates without re-entering topics.
- The complete loop must work without a chatbot or JSON editing.
- Chatbot-assisted and direct edits must pass through the same validation, invalidation, and calculation rules.
- Imported proposals must remain staged until the user verifies and accepts them.
- The same inputs must always generate the same scores and ballot translation.
- Every non-Unknown mapping claim must be traceable to a reason and HTTP(S) source.
- Direct mapping claims and Unknown cells are saved only through an explicit labeled human-verification action; selecting an editor state never creates evidence.
- Low-coverage and Unknown guides remain shareable with prominent amber warnings, explicit acknowledgment, and clearly labeled human overrides.
- A peer must be able to explain why a recommendation changed after changing one topic rating.
- Invalid imports or links must never alter local work; `vt.m2` must remain byte-for-byte unchanged.
- A feature is incomplete until its activated-friend and peer behaviors pass end-to-end on desktop and mobile.
- If representative reproducible links exceed the size budget or fail in a pilot, pause and evaluate immutable short-link storage rather than dropping evidence.
- If mapping effort becomes excessive, simplify the mapping and verification interaction—not the reusable profile or audit trail.
- If chatbot verification takes as long as entering the same prepared research directly, simplify the task packet or verification queue before adding integrations.
- If any core task is only pleasant with a chatbot, the MVP has failed.
