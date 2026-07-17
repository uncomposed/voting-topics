import { useState } from 'react';
import { ELECTION_VERSION, ElectionTemplateSchema, newId, type Contest, type ElectionWorkspace } from '../domain/schema';

interface Props {
  workspace: ElectionWorkspace;
  onUpdateElection: (patch: Partial<Pick<ElectionWorkspace['election'], 'title' | 'electionDate' | 'jurisdiction' | 'disclaimer'>>) => void;
  onReplaceContests: (contests: Contest[]) => void;
}

function contestForMethod(contest: Contest, method: Contest['method']): Contest {
  const base = { id: contest.id, title: contest.title, description: contest.description, options: contest.options };
  if (method === 'choose-up-to') return { ...base, method, maxSelections: 1 };
  if (method === 'rcv') return { ...base, method, maxRankings: Math.min(3, contest.options.length) };
  if (method === 'yes-no') return { ...base, method, options: [{ id: 'yes', name: 'Yes' }, { id: 'no', name: 'No' }] };
  return { ...base, method };
}

export function ElectionSetup({ workspace, onUpdateElection, onReplaceContests }: Props) {
  const election = workspace.election;
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const patchContest = (id: string, patch: (contest: Contest) => Contest) => onReplaceContests(election.contests.map((contest) => contest.id === id ? patch(contest) : contest));
  const importJson = () => {
    try {
      const parsed = ElectionTemplateSchema.parse(JSON.parse(json));
      onUpdateElection({ title: parsed.title, electionDate: parsed.electionDate, jurisdiction: parsed.jurisdiction, disclaimer: parsed.disclaimer });
      onReplaceContests(parsed.contests);
      setError('');
      setJson('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Election JSON is invalid.');
    }
  };
  return (
    <main className="page" id="main">
      <div className="page-heading">
        <p className="eyebrow">Election setup · manual or JSON</p>
        <h1>Define the real ballot</h1>
        <p>The election method controls the official marks we generate. Unsupported methods fail validation; nothing silently falls back to first-past-the-post.</p>
      </div>
      <section className="card form-grid" aria-label="Election details">
        <label>Election title<input defaultValue={election.title} onBlur={(event) => onUpdateElection({ title: event.currentTarget.value })} /></label>
        <label>Jurisdiction<input defaultValue={election.jurisdiction} onBlur={(event) => onUpdateElection({ jurisdiction: event.currentTarget.value })} /></label>
        <label>Election date<input defaultValue={election.electionDate} onBlur={(event) => onUpdateElection({ electionDate: event.currentTarget.value })} type="date" /></label>
        <label className="wide">Disclaimer<textarea defaultValue={election.disclaimer} onBlur={(event) => onUpdateElection({ disclaimer: event.currentTarget.value })} /></label>
      </section>
      <div className="stack">
        {election.contests.map((contest) => (
          <article className="card contest-editor" key={contest.id}>
            <div className="form-grid">
              <label>Contest title<input defaultValue={contest.title} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, title: event.currentTarget.value }))} /></label>
              <label>Voting method
                <select value={contest.method} onChange={(event) => patchContest(contest.id, (current) => contestForMethod(current, event.currentTarget.value as Contest['method']))}>
                  <option value="fptp">First past the post</option><option value="choose-up-to">Choose up to N</option><option value="rcv">Ranked choice / IRV</option><option value="star">STAR voting</option><option value="yes-no">Yes / No</option>
                </select>
              </label>
              {'maxSelections' in contest && <label>Maximum selections<input min="1" type="number" value={contest.maxSelections} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, maxSelections: Number(event.currentTarget.value) } as Contest))} /></label>}
              {'maxRankings' in contest && <label>Maximum rankings<input min="1" type="number" value={contest.maxRankings} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, maxRankings: Number(event.currentTarget.value) } as Contest))} /></label>}
              <label className="wide">Options (one name per line)
                <textarea disabled={contest.method === 'yes-no'} defaultValue={contest.options.map((option) => option.name).join('\n')} onBlur={(event) => {
                  const names = event.currentTarget.value.split('\n').map((name) => name.trim()).filter(Boolean);
                  if (names.length >= 2) patchContest(contest.id, (current) => ({ ...current, options: names.map((name, index) => ({ id: current.options[index]?.id ?? newId('option'), name })) } as Contest));
                }} />
              </label>
            </div>
            <button className="button button-quiet danger" onClick={() => onReplaceContests(election.contests.filter((candidate) => candidate.id !== contest.id))} type="button">Remove contest</button>
          </article>
        ))}
      </div>
      <button className="button button-secondary" onClick={() => onReplaceContests([...election.contests, { id: newId('contest'), title: 'New contest', method: 'fptp', options: [{ id: newId('option'), name: 'Option A' }, { id: newId('option'), name: 'Option B' }] }])} type="button">Add contest</button>
      <details className="card import-panel">
        <summary>Validated election JSON import / export</summary>
        <p>Version must be <code>{ELECTION_VERSION}</code>. Import is parsed before replacing anything.</p>
        <textarea aria-label="Election JSON" value={json} onChange={(event) => setJson(event.currentTarget.value)} placeholder={JSON.stringify(election, null, 2)} />
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="button-row"><button className="button button-primary" disabled={!json} onClick={importJson} type="button">Validate and import</button><button className="button button-secondary" onClick={() => setJson(JSON.stringify(election, null, 2))} type="button">Load current JSON</button></div>
      </details>
    </main>
  );
}
