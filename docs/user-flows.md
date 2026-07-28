# MVP stakeholder flows

## Politically activated friend — direct path

1. **Library:** create, duplicate, archive, restore, import, export, and switch profiles and elections. Pair one profile with one election or resume an incomplete workspace with visible progress.
2. **Priorities:** search and filter the versioned menu, select outcomes, write custom priorities, and STAR-rate importance. Review zero-star priorities and menu/custom provenance before continuing.
3. **Election:** enter election details, add one structured contest at a time, select its actual voting method, add options and official sources, and explicitly verify options and ballot rules. Export the independent election at any point.
4. **Relevance:** choose the small set of profile priorities materially affected by each contest. Relevance does not rate candidates.
5. **Assessment:** work one priority at a time with all viable options side by side. Opening Assessed or Unknown creates only a blank local draft. A cell counts as complete only after an explicit “human verified” save with 0–5 option fit, confidence, reason, reusable source—or an explicit saved Unknown. Use progress, filters, and next-incomplete navigation to close omissions.
6. **Draft and review:** inspect option STAR scores, weighted coverage, influential contributions, missing research, close boundaries, provenance, generated marks, personal notes, and explicit human overrides.
7. **Share:** independently export the profile and election, or confirm every contest and create an immutable guide link/JSON/print output.

This path exposes no JSON and requires no chatbot.

## Politically activated friend — optional chatbot path

At Priorities, Election, Relevance, Assessment, or Review:

1. Open the contextual **Work with a chatbot** drawer and describe the question.
2. Choose the offered scope where applicable, then copy or download the task packet.
3. Discuss or research in any chatbot product; Voting Topics sends nothing itself.
4. Paste/upload one returned proposal. Voting Topics validates its version, task id, input digest, complete references, and task-specific constraints.
5. If it fails, copy the generated repair brief. If it passes, inspect each staged item and accept, edit, or reject it.
6. Accepted research is labeled chatbot-proposed and human-verified. It then uses the same invalidation and calculation path as direct entry.

A changed input makes the response stale. No proposal mutates accepted work before confirmation, and an override suggestion never marks the ballot automatically.

## Peer

1. Open a read-only snapshot without an account or profile.
2. Identify the final mark, underlying STAR scores, influential priorities, reasons, sources, coverage, voting-method translation, provenance, verification, and any override.
3. Import the election alone, or choose **Make my copy**. Existing local work is preserved; a complete copy gets independent ids and keeps the parent digest for comparison.
4. Change topic stars, add a priority, correct sourced evidence, or override a contest. A new priority cannot affect a contest until it is selected and mapped.
5. Regenerate and inspect a semantic diff covering ratings, mappings, scores, translated marks, overrides, and explanations.
6. Reshare and reopen the independent child snapshot.

There is no canonical group map or shared mutable priority profile. A peer who reshares becomes the activated friend for another circle.

## Election publisher

1. Build and human-verify a standalone election inside Voting Topics.
2. Export its JSON and publish it on GitHub, a Gist, or another public HTTPS host.
3. A recipient imports by paste, file, GitHub blob/Gist URL, or raw URL and previews the untrusted content before acceptance.
4. The recipient can fork the election, pair it with any local profile, and perform their own research. Voting Topics provides no canonical election database.

## Legacy owner

1. Download the exact raw `vt.m2`, prototype, or experimental-guide bytes.
2. Preview v0/v1/v2 profile conversion or corrected-prototype library normalization before state changes.
3. Inspect copied artifacts, specificity warnings, provenance, verification resets, and discarded old category importance.
4. Cancel with no changes, or accept one atomic copy while the original bytes remain untouched.

## Failure behavior and audit checks

- Missing evidence is Unknown only after the user explicitly records it; it is never zero and never synthesized by changing a dropdown.
- Incomplete matrices block sharing. Any option below 60% coverage blocks automatic translation; a clearly labeled human override remains available.
- Low coverage, Unknown cells, research-needed contests, close calls, and human overrides appear as amber warnings. Sharing remains available only after the author acknowledges those warnings, and peers see the same warning summary.
- Priority wording changes invalidate linked assessments; category-only changes do not.
- Contest method/option changes invalidate only that contest.
- Invalid imports, remote payloads, proposals, or guide links leave existing work unchanged.
- Clipboard failure leaves selectable text; oversized guide links require JSON fallback.
- The governing regression test is to remove every chatbot control and complete the direct creator and peer loops.
