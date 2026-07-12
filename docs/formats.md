# Portable JSON formats

The executable contracts live in `src/guide/schema.ts`; this document explains their intent. Unknown or malformed data is rejected before it can replace a saved guide.

## `vt.election-template.v1`

An election template contains:

- stable `id`, `title`, `electionDate`, and `jurisdiction` metadata;
- `isFictional` and a required `disclaimer`;
- one or more contests with unique ids;
- candidate contests using `choose-one` or `choose-up-to`, an explicit `maxSelections`, and at least two uniquely identified candidates;
- measure contests with Yes, No, or Abstain guide positions.

Gate 1 intentionally excludes ranked choice, write-ins, districts that alter the guide while editing, and a visual template builder.

## `vt.guide.v1`

A guide embeds its election template so a review link is self-contained. It also contains:

- guide identity, title, optional author label, and timestamps;
- reusable desired outcomes (`values`);
- exactly one typed recommendation per contest;
- explicit candidate ids or a measure position;
- rationale, linked outcome ids, optional sources, and optional 0–5 candidate ratings.

The draft schema validates structure while allowing unfinished recommendations. The published schema additionally requires:

- a non-empty title;
- every contest to have a valid explicit selection;
- rationale of at least 20 characters;
- at least one existing desired-outcome link per recommendation;
- complete, valid source URLs when a source row is present;
- no unknown contests, candidates, ratings, or desired-outcome references.

## Review link envelope

A published guide is wrapped as `{ "v": "g1", "guide": ... }`, gzip-compressed, base64url encoded, and placed after `#guide=g1.`. Links longer than 6,000 characters are refused with a JSON-export fallback. The representative completed demo is required by tests to remain below 4,000 characters.
