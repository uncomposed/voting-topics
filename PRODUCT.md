# Trusted Voter Guide Product Constitution

## Mission

Voting Topics helps a politically engaged person create a transparent voter guide and share it privately so friends can understand, copy, and adapt the recommendations.

## Primary actors

- **Guide creator:** researches an election, makes explicit recommendations, names the outcomes they want, and explains why each choice advances those outcomes.
- **Reviewing friend:** opens a read-only guide, understands both the recommendation and reasoning, and may make a private local copy.

## Required behaviors

Every active product change must measurably improve at least one behavior:

1. **Create** a complete guide without maintainer assistance.
2. **Share** the complete guide through a reliable private link or portable fallback.
3. **Understand** what is recommended, why, and which desired outcomes motivate it.
4. **Copy** a shared guide into a private editable version without losing existing work.

## Gate 1 boundaries

Gate 1 includes a fictional election demo, validated election-template JSON import, explicit candidate or measure recommendations, required reusable outcome statements, rationale and sources, optional personal-fit ratings, compressed review links, local persistence, JSON export, and print-to-PDF.

Gate 1 does not include real election data, accounts, server-side storage, analytics, politician profiles, arbitrary comparison, AI workflows, ranked-choice contests, a visual election-template editor, or the legacy preference-set workflow.

## Evidence and decision rules

- A feature is not complete merely because it renders or has unit coverage; its full user behavior must pass an end-to-end test.
- When a flow needs additional explanation, first test whether a step or concept can be removed.
- Only one Gate 1 implementation slice may be in progress at a time.
- New work must name the behavior it advances, its acceptance evidence, and what observation would falsify its value.
- Work that advances none of Create, Share, Understand, or Copy is deferred.

## Gate 2 pilot thresholds

These thresholds are hypotheses to test, not adoption claims:

- Four of five creators complete a five-contest guide in under 20 minutes without intervention.
- Four of five creators actually share the guide.
- At least 10 of 15 recipients can identify both the recommendation and its rationale.
- At least three recipients make or request a copy.
- No guide is lost and no review link fails.
- Total maintainer support for the pilot remains under one hour.

If the narrow flow fails after two simplification cycles, pause development rather than adding another explanatory or automation layer.
