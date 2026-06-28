# User Personas and Flows

## Personas

### Activated ballot builder
A politically literate friend who researches choices, builds a reusable sample ballot, and shares it with people who trust their judgment.

### Reviewing friend
A friend who receives a sample ballot, wants to understand the decisions and value differences, and then makes a local copy with their own changes.

### Power user comparing sets
An experienced user who imports and compares multiple preference sets.

## Flows

### Activated ballot builder
1. **StarterPackPicker / Import** – load starter topics or a prepared preference set.
2. **TopicList** – refine outcomes, ratings, notes, and source links that explain the recommendation.
3. **BallotBuilder** – assemble offices, candidates, measures, scores, and reasoning.
4. **Share / Export** – copy a review link for the complete sample ballot, with JSON/PDF as backup formats.

Acceptance criteria:
- A complete sample ballot unlocks a review link that includes offices, candidates, scores, measures, notes, and reasoning.
- The copied review link opens the same ballot in a fresh browser session.
- If the ballot is too large for a reliable URL, the builder is directed to JSON/PDF backup formats instead of receiving a broken link.

### Reviewing friend
1. **Open review link** – load the shared preference set or sample ballot.
2. **Review decisions** – inspect topics, scores, and reasoning to understand the builder's values.
3. **Make My Copy** – switch from review context into a local editable version.
4. **Adjust and share** – change ratings or choices, then copy a new review link.

Acceptance criteria:
- Shared-review mode is entered only after a valid payload is decoded.
- Invalid shared links show an error without changing the current local work.
- `Make My Copy` removes the shared payload from the URL while preserving the imported work locally.
- Refreshing after `Make My Copy` does not reapply the original shared payload.
- Opening a different shared link in the same tab applies that new link only after confirming replacement of the currently loaded work.

### Power user comparing sets
1. **StarterPackPicker** or Import – load multiple preference sets.
2. **PreferenceSetComparison** – review differences between sets.
3. **TopicCards** / **TopicList** – edit merged topics.
4. **BallotBuilder** – optionally produce a combined ballot.

## Share/Review Invariants

- Every entry point for a review link uses the same application path: initial URL load, hash navigation, Toolbar paste, mobile action bar paste, and mobile menu paste.
- Review metadata records whether the current work came from a shared starter link, full preference set, or full sample ballot.
- Shared-review metadata is session state, not persisted local storage state.
- Clearing or copying shared work must reset the share guard so another link can be reviewed in the same tab.
