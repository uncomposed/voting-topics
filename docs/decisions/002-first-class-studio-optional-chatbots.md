# ADR 002: First-class studio with optional chatbot handoffs

- **Status:** Accepted
- **Date:** 2026-07-17
- **Supersedes:** ADR 001 only where it excluded all LLM workflows
- **Historical anchors:** `archive/pre-trusted-guide-pivot`, `archive/hand-authored-guide-experiment`, `archive/reusable-peer-ballot-prototype`

## Context

The pre-pivot application had a large starter pack and a Bring Your Own AI screen, but both were feature islands beside a growing workspace. The chatbot screen exported broad application JSON and prose schema documentation instead of helping with the task the user was currently completing. The later hand-authored-guide experiment simplified away the reusable priority-to-election mechanism. The corrected Gate 1 prototype restored that mechanism and its peer loop, but its priority, election, and mapping interfaces remain prototype forms.

## Decision

Voting Topics will be a complete local-first studio. The direct interface is the primary product at every step. A user may optionally export a scoped, versioned task packet to any chatbot and import its proposed response.

Direct edits and accepted proposals use the same domain mutations. Imported proposals are untrusted and remain staged until schema validation, reference validation, semantic preview, and explicit human acceptance succeed. Accepted claims retain provenance that distinguishes human-authored work from chatbot-proposed, human-verified work.

Profiles, elections, paired workspaces, and guide snapshots are separately portable artifacts. Elections are authored, hosted, and forked by users; Voting Topics will not maintain a canonical election database.

## Consequences

- Removing every chatbot control leaves a complete usable product.
- Handoffs appear in context, not in a separate AI workspace.
- Machine-readable JSON Schemas are generated from executable contracts.
- Chatbot responses are small task-specific proposals rather than full internal state dumps.
- There are no chatbot credentials, vendor APIs, background research calls, or automatic acceptance.
- The historical starter pack is editorial source material for a versioned priority menu, not a scoring hierarchy.
- A guide exposes provenance and verification so peers can distinguish calculated, proposed, verified, and overridden information.

## Falsification

This decision fails if users need a chatbot or JSON editor to finish, if imported work bypasses human verification, if a task packet only works with one vendor, or if verification is no faster than entering the same prepared data directly.
