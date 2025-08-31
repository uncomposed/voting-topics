# 📄 `CONTRIBUTING.md`

# Contributing to Voting Topics

Thanks for considering contributing! This project depends on community input to improve topics, builder features, and privacy protections.

---

## 🧭 Ways to Contribute

- **Suggest new topics or edits**  
  Add/modify JSON files under `/topics` and submit a PR.  
  Each topic file should conform to the [Topic JSON Schema](docs/topic-schema.json).

- **Work on open issues**  
  See [Issues](https://github.com/uncomposed/voting-topics/issues). Look for `good first issue` or `help wanted`.

- **Improve UI/UX**  
  React components (Topic cards, export flows) live in `/src/components`.

- **Backend improvements**  
  Convex functions are in `/src/convex`. Ideas: abuse prevention, better hashing, sync with GitHub topics.

---

## 🛠 Development Workflow

1. **Fork the repo** and create your branch:
```zsh
   git checkout -b feature/my-feature
```
2.	Make your changes
•	For topics: update JSON under /topics.
•	For code: follow existing structure & style.
•	Create tests to catch any bugs you just squashed or features you added.
3.	Run lint & tests
```zsh
    npm run lint
    npm run test
```
4. Add to the Changelog.md with what changed and why. The purpose is to reduce the likely hood of future contributors making a treading the same ground on a path that leads nowhere
4.	Commit & push
```zsh
git commit -m "feat: add [something]"
git push origin feature/my-feature
```

5.	Open a PR
•	Explain the change clearly.
•	Link to related issue(s) or milestone.

⸻
## Working with AI
1. Get any GitHub issues that may have changed since issue.json was last modified.  
```zsh
 gh issue list \
  --repo uncomposed/voting-topics \
  --state all \
  --limit 1000 \
  --json number,title,body,labels,comments,createdAt,closedAt,milestone \
  > issues.json
```
2. Make sure the contributor, human or otherwise understands the intent of the project and current and closed issues.
3. Do not close issues until they are validated by a user, feel free to add comments though. 
⸻
🧾 Topic JSON Format

Each topic file must follow schema tsb.v0:
```json
{
  "title": "Utilization of existing Urban Infrastructure",
  "importance": 4,
  "direction": "Support shift to land-based taxation",
  "notes": "Aligns incentives for housing affordability",
  "sources": ["https://en.wikipedia.org/wiki/Land_value_tax"]
}Í
```
Validation runs in CI on all topic PRs.

⸻

🔒 Privacy & Security
	•	Do not add or request PII in issues or topics.
	•	Use milestone titles (not IDs) when creating issues with GitHub CLI.
	•	Never include # comments in CLI command blocks — this breaks zsh.

⸻

🏷 Labels

We use labels to organize work:
	•	spec – schema, standards, formats
	•	ui – front-end work
	•	state – Zustand state mgmt
	•	export – export flows (JSON/PDF/JPEG)
	•	backend – Convex/server code
	•	security – cryptography, privacy
	•	abuse – abuse prevention
	•	topics – topic library PRs
	•	compliance – disclaimers, legal copy
	•	integrations – VOTE411/BallotReady, external links
	•	good first issue – easy starter tasks

⸻

✅ Best Practices
	•	Keep PRs focused (one feature/fix per PR).
	•	Reference issues in commits/PRs (Fixes #42).
	•	Add tests where relevant.
	•	Respect privacy-first design (no analytics, no PII).
	•	Be kind and collaborative.

⸻

📬 Getting Help
	•	Open a Discussion for questions/ideas.
	•	Tag issues with help wanted if you’d like feedback or pairing.

⸻

Thanks for contributing 💜
