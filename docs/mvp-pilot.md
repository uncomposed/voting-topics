# MVP pilot protocol and evidence record

The application is release-candidate software only after this protocol passes. Do not reinterpret automated tests as participant evidence and do not enter `PILOT-PASSED` in the deployment workflow until the decision record at the bottom is complete.

## Cohort

- Five politically activated friends. At least two use only Voting Topics; at least three may use two or more different chatbot products across the cohort.
- Ten peers who did not create the guides they inspect.
- Record participant aliases, device class, browser, direct/mixed/chatbot path, and whether maintainer help occurred. Do not record political opinions or chatbot transcripts unless a participant explicitly agrees.

## Prepared creator task

Each creator must:

1. create or select and STAR-rate a reusable priority profile;
2. create, import, and human-verify an election;
3. select relevance and complete sourced assessments or explicit Unknown states;
4. inspect the deterministic draft, resolve warnings, and confirm or override each contest;
5. share and reopen an immutable guide;
6. reuse the same profile with a second election without re-entering priorities.

At least one election must be exported to GitHub, imported into a clean browser profile by public URL, paired, researched, shared, forked, changed, reshared, and reopened. Chatbot-path creators must use the actual task packet, repair, preview, and selective-acceptance interfaces; pasting manually prepared perfect JSON does not count as usability evidence.

## Prepared peer task

Without coaching, each peer must identify the final ballot mark, one influential priority, its cited evidence, whether evidence was chatbot-proposed, and whether a human override occurred. They are then asked to make an independent copy, change one priority rating, explain the resulting semantic diff, reshare, and reopen the fork.

## Evidence table

| Measure | Pass threshold | Result | Evidence location |
| --- | ---: | ---: | --- |
| Creators finish and share without maintainer intervention | 4/5 | Pending | |
| Peers identify mark, influence, evidence, and override | 8/10 | Pending | |
| Peers make an independent copy | 6/10 | Pending | |
| Peers change, reshare, and reopen | 5/10 | Pending | |
| Work loss incidents | 0 | Pending | |
| Unknown mistaken for zero | 0 | Pending | |
| Chatbot proposal mistaken for automatically accepted work | 0 | Pending | |
| Total maintainer assistance | under 2 hours | Pending | |
| GitHub election clean-browser loop | 1 complete | Pending | |
| Representative share links retain evidence within budget | all | Pending | |

For every failed or assisted transition, record the interface state, expected next action, observed action, and whether the failure occurred on the direct or optional-chatbot path. Compare against the direct alternative before attributing a failure to a chatbot.

## Falsification and stopping rule

The pilot fails if a core step requires a chatbot, JSON editing, or maintainer intervention; if a chatbot supplies a capability absent from the direct interface; if assistant verification takes as long as entering the same prepared research directly; if users cannot form a specific priority; if provenance and overrides are confused; if the GitHub or peer loops are unreliable; if evidence must be dropped to share; or if failed imports mutate work.

If the same gate fails twice, stop feature expansion. Redesign that transition or its task contract, rerun the focused task, and only then restart the full pilot. Do not respond by adding accounts, vendor APIs, centralized election storage, or more background automation.

## Release decision

- Pilot date: Not yet run
- Facilitator: Not yet assigned
- Direct-path creators completed: Pending
- Mixed/chatbot-path creators completed and chatbot products used: Pending
- Peers completed: Pending
- Total maintainer assistance: Pending
- Failed gates and redesigns: Pending
- Representative maximum guide URL length: Covered by automated representative-payload tests; participant evidence pending
- Evidence repository/folder: Automated tests in this repository; participant evidence pending
- Decision: **EARLY LAUNCH APPROVED — formal pilot remains outstanding**
- Approver and date: Repository owner, 2026-08-07

### Early-launch exception

The repository owner approved replacing the existing production experience before the formal pilot because the reworked application is judged materially better for users and there are no known current users. This accepts unresolved usability uncertainty; it does not claim that participant thresholds passed. The exception is valid only while there are no known users and automated release checks, exact-current-site backup, rollback verification, and live post-deployment smoke checks pass. Any known work loss, damaged share/import loop, or inability to restore the previous site stops the release. Once real usage begins, subsequent material releases return to the participant-evidence gate above unless another dated decision explicitly supersedes it.
