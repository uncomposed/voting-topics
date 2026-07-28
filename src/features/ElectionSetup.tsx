import { useState } from 'react';
import { HandoffPanel } from '../components/HandoffPanel';
import { electionContext, type Proposal } from '../domain/handoff';
import { newId, type Contest, type ElectionProposal, type ElectionTemplate, type Source } from '../domain/schema';

interface Props {
  election: ElectionTemplate;
  onApplyProposal: (proposal: ElectionProposal, toolLabel?: string) => void;
  onUpdateElection: (patch: Partial<Pick<ElectionTemplate, 'title' | 'electionDate' | 'jurisdiction' | 'disclaimer'>>) => void;
  onReplaceContests: (contests: Contest[]) => void;
  onSource: (source: Source) => void;
  onVerify: (contestId: string, verified: boolean) => void;
  onContinue: () => void;
}

function downloadElection(election: ElectionTemplate) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([`${JSON.stringify(election, null, 2)}\n`], { type: 'application/json' }));
  anchor.download = 'voting-topics-election.json'; anchor.click(); URL.revokeObjectURL(anchor.href);
}

function contestForMethod(contest: Contest, method: Contest['method']): Contest {
  const base = { id: contest.id, title: contest.title, description: contest.description, ballotInstructions: contest.ballotInstructions, sourceIds: contest.sourceIds, verification: { status: 'draft' as const }, options: contest.options };
  if (method === 'choose-up-to') return { ...base, method, maxSelections: 1 };
  if (method === 'rcv') return { ...base, method, maxRankings: Math.min(3, contest.options.length) };
  if (method === 'yes-no') return { ...base, method, options: [{ id: 'yes', name: 'Yes', sourceIds: [] }, { id: 'no', name: 'No', sourceIds: [] }] };
  if (method === 'star') return { ...base, method };
  return { ...base, method: 'fptp' };
}

export function ElectionSetup({ election, onApplyProposal, onUpdateElection, onReplaceContests, onSource, onVerify, onContinue }: Props) {
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const patchContest = (id: string, patch: (contest: Contest) => Contest) => onReplaceContests(election.contests.map((contest) => contest.id === id ? patch(contest) : contest));
  const verified = election.contests.filter((contest) => contest.verification.status === 'verified').length;

  return <main className="page" id="main">
    <div className="page-heading">
      <p className="eyebrow">Election · owned and verified by you</p><h1>Define the ballot voters will see</h1>
      <p>Create one contest at a time or import an election from a file, GitHub, or your chatbot. Voting Topics validates the structure; you verify the official options and voting rules.</p>
    </div>

    <section className="card election-overview">
      <div className="section-heading"><div><h2>{election.title}</h2><p>{election.jurisdiction} · {election.electionDate}</p></div><span className={`status ${verified === election.contests.length ? 'status-ready' : 'status-research-needed'}`}>{verified}/{election.contests.length} contests verified</span></div>
      <div className="form-grid">
        <label>Election title<input defaultValue={election.title} onBlur={(event) => onUpdateElection({ title: event.currentTarget.value.trim() || election.title })} /></label>
        <label>Jurisdiction<input defaultValue={election.jurisdiction} onBlur={(event) => onUpdateElection({ jurisdiction: event.currentTarget.value.trim() || election.jurisdiction })} /></label>
        <label>Election date<input defaultValue={election.electionDate} onBlur={(event) => onUpdateElection({ electionDate: event.currentTarget.value })} type="date" /></label>
        <label className="wide">Voting disclaimer<textarea defaultValue={election.disclaimer} onBlur={(event) => onUpdateElection({ disclaimer: event.currentTarget.value })} /></label>
      </div>
      <button className="button button-secondary" onClick={() => downloadElection(election)} type="button">Export election JSON</button>
    </section>

    <section className="card source-panel">
      <div className="section-heading"><div><p className="eyebrow">Official facts</p><h2>Election sources</h2></div><span className="count-badge">{election.sources.length}</span></div>
      <p>Use official election pages or notices to verify who and what is on the ballot and which marks are allowed.</p>
      <ul>{election.sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer" target="_blank">{source.label}</a></li>)}</ul>
      <div className="inline-form"><label>Source label<input value={sourceLabel} onChange={(event) => setSourceLabel(event.currentTarget.value)} /></label><label>HTTPS URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} type="url" /></label><button className="button button-secondary" disabled={!sourceLabel.trim() || !/^https?:\/\//u.test(sourceUrl)} onClick={() => { onSource({ id: newId('election-source'), label: sourceLabel.trim(), url: sourceUrl.trim() }); setSourceLabel(''); setSourceUrl(''); }} type="button">Add official source</button></div>
    </section>

    <div className="section-heading contest-section-heading"><div><p className="eyebrow">Contests</p><h2>Build and verify each contest</h2></div><button className="button button-primary" onClick={() => onReplaceContests([...election.contests, { id: newId('contest'), title: 'New contest', method: 'fptp', sourceIds: [], verification: { status: 'draft' }, options: [{ id: newId('option'), name: 'Option A', sourceIds: [] }, { id: newId('option'), name: 'Option B', sourceIds: [] }] }])} type="button">Add contest</button></div>
    <div className="stack">{election.contests.map((contest, contestIndex) => {
      const canVerify = contest.sourceIds.length > 0 && contest.options.length >= 2 && contest.options.every((option) => option.sourceIds.length > 0);
      return <article className="card contest-editor" key={contest.id}>
        <div className="review-heading"><div><p className="eyebrow">Contest {contestIndex + 1}</p><h2>{contest.title}</h2></div><span className={`status status-${contest.verification.status === 'verified' ? 'ready' : 'research-needed'}`}>{contest.verification.status}</span></div>
        <div className="form-grid">
          <label>Contest title<input defaultValue={contest.title} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, title: event.currentTarget.value.trim() || current.title, verification: { status: 'draft' } }))} /></label>
          <label>Voting method<select value={contest.method} onChange={(event) => patchContest(contest.id, (current) => contestForMethod(current, event.currentTarget.value as Contest['method']))}><option value="fptp">First past the post</option><option value="choose-up-to">Choose up to N</option><option value="rcv">Ranked choice / IRV</option><option value="star">STAR voting</option><option value="yes-no">Yes / No</option></select></label>
          {'maxSelections' in contest && <label>Maximum selections<input min="1" max={contest.options.length - 1} type="number" value={contest.maxSelections} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, maxSelections: Math.max(1, Math.min(current.options.length - 1, Number(event.currentTarget.value))), verification: { status: 'draft' } } as Contest))} /></label>}
          {'maxRankings' in contest && <label>Maximum rankings<input min="1" max={contest.options.length} type="number" value={contest.maxRankings} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, maxRankings: Math.max(1, Math.min(current.options.length, Number(event.currentTarget.value))), verification: { status: 'draft' } } as Contest))} /></label>}
          <label className="wide">Official ballot instructions<textarea defaultValue={contest.ballotInstructions ?? ''} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, ballotInstructions: event.currentTarget.value.trim() || undefined, verification: { status: 'draft' } }))} /></label>
        </div>
        <fieldset className="source-checks"><legend>Official sources for this contest</legend>{election.sources.length ? election.sources.map((source) => <label key={source.id}><input checked={contest.sourceIds.includes(source.id)} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, sourceIds: event.currentTarget.checked ? [...current.sourceIds, source.id] : current.sourceIds.filter((id) => id !== source.id), verification: { status: 'draft' } }))} type="checkbox" /> {source.label}</label>) : <p className="help">Add an official election source above before verifying this contest.</p>}</fieldset>
        <div className="option-editor-list"><div className="option-editor-heading"><h3>Ballot options</h3><div className="button-row">{election.sources.length > 0 && <button className="button button-secondary button-small" onClick={() => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((option) => ({ ...option, sourceIds: [...new Set([...option.sourceIds, ...current.sourceIds])] })), verification: { status: 'draft' } } as Contest))} type="button">Use contest sources for all options</button>}{contest.method !== 'yes-no' && <button className="button button-secondary button-small" onClick={() => patchContest(contest.id, (current) => ({ ...current, options: [...current.options, { id: newId('option'), name: 'New option', sourceIds: [] }], verification: { status: 'draft' } } as Contest))} type="button">Add option</button>}</div></div>{contest.options.map((option) => <div className="option-row" key={option.id}>
          <label>Name<input disabled={contest.method === 'yes-no'} defaultValue={option.name} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, name: event.currentTarget.value.trim() || item.name } : item), verification: { status: 'draft' } } as Contest))} /></label>
          <label>Party or label<input defaultValue={option.party ?? ''} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, party: event.currentTarget.value.trim() || undefined } : item), verification: { status: 'draft' } } as Contest))} /></label>
          <label>Website<input defaultValue={option.website ?? ''} type="url" onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, website: event.currentTarget.value.trim() || undefined } : item), verification: { status: 'draft' } } as Contest))} /></label>
          <label className="option-description">Description<textarea defaultValue={option.description ?? ''} onBlur={(event) => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, description: event.currentTarget.value.trim() || undefined } : item), verification: { status: 'draft' } } as Contest))} /></label>
          <fieldset className="option-sources"><legend>Sources confirming this ballot option</legend>{election.sources.map((source) => <label key={source.id}><input checked={option.sourceIds.includes(source.id)} onChange={(event) => patchContest(contest.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, sourceIds: event.currentTarget.checked ? [...item.sourceIds, source.id] : item.sourceIds.filter((id) => id !== source.id) } : item), verification: { status: 'draft' } } as Contest))} type="checkbox" /> {source.label}</label>)}</fieldset>
          {contest.method !== 'yes-no' && contest.options.length > 2 && <button aria-label={`Remove ${option.name}`} className="button button-quiet danger button-small" onClick={() => patchContest(contest.id, (current) => ({ ...current, options: current.options.filter((item) => item.id !== option.id), verification: { status: 'draft' } } as Contest))} type="button">Remove</button>}
        </div>)}</div>
        <div className="verification-row"><label><input checked={contest.verification.status === 'verified'} disabled={!canVerify && contest.verification.status !== 'verified'} onChange={(event) => onVerify(contest.id, event.currentTarget.checked)} type="checkbox" /> I checked these options and voting rules against the selected official sources.</label>{!canVerify && <small>Select a contest source and at least one source for every ballot option.</small>}</div>
        <button className="button button-quiet danger" onClick={() => onReplaceContests(election.contests.filter((item) => item.id !== contest.id))} type="button">Remove contest</button>
      </article>;
    })}</div>
    <section className="card profile-next-step">
      <div><p className="eyebrow">Next step</p><h2>{verified === election.contests.length ? 'Election verified' : `Verify ${election.contests.length - verified} remaining ${election.contests.length - verified === 1 ? 'contest' : 'contests'}`}</h2><p>{verified === election.contests.length ? 'Continue with the most recent matching workspace, or create one if this profile and election have not been paired.' : 'Every contest must be checked against its selected official sources before research begins.'}</p></div>
      <button className="button button-primary" disabled={verified !== election.contests.length} onClick={onContinue} type="button">Resume or start pair research</button>
    </section>
    <details className="optional-tools card"><summary>Optional chatbot election research</summary><HandoffPanel context={electionContext(election)} description="Give your chatbot the election contract and current draft. Ask it to research official contests, options, voting methods, and sources; then verify the proposed election here." onAccept={(proposal: Proposal, selected, toolLabel) => { if (proposal.version === 'vt.election-proposal.v1' && selected.has('election')) onApplyProposal(proposal, toolLabel); }} referenceContext={{ election }} taskType="election" title="Research or structure this election" /></details>
  </main>;
}
