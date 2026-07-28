import { HandoffPanel } from '../components/HandoffPanel';
import { diffGuides, summarizeDiff } from '../domain/diff';
import { reviewContext, type Proposal } from '../domain/handoff';
import type { BallotMark, Contest, ContestDecision, ContestDraft, ElectionTemplate, ElectionWorkspace, PeerGuide, ReviewProposal, TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  election: ElectionTemplate;
  workspace: ElectionWorkspace;
  parentGuide: PeerGuide | null;
  onDecision: (contestId: string, patch: Partial<ContestDecision>) => void;
  onApplyReview: (proposal: ReviewProposal, contestIds: Set<string>, toolLabel?: string) => void;
  onContinue: () => void;
}

function optionName(contest: Contest, id: string): string {
  return contest.options.find((option) => option.id === id)?.name ?? id;
}

function markText(contest: Contest, mark: BallotMark | null): string {
  if (!mark) return 'No generated ballot mark';
  if (mark.method === 'fptp' || mark.method === 'choose-up-to') return mark.selectedOptionIds.map((id) => optionName(contest, id)).join(', ') || 'No selection';
  if (mark.method === 'rcv') return mark.rankedOptionIds.map((id, index) => `${index + 1}. ${optionName(contest, id)}`).join(' · ');
  if (mark.method === 'star') return Object.entries(mark.scores).map(([id, score]) => `${optionName(contest, id)} ${score}/5`).join(' · ');
  return mark.position.toUpperCase();
}

function ManualOverride({ contest, value, onChange }: { contest: Contest; value: BallotMark | null; onChange: (mark: BallotMark | null) => void }) {
  if (contest.method === 'fptp') return <label>Human contest override<select value={value?.method === 'fptp' ? value.selectedOptionIds[0] ?? '' : ''} onChange={(event) => onChange(event.currentTarget.value ? { method: 'fptp', selectedOptionIds: [event.currentTarget.value] } : null)}><option value="">Use generated draft</option>{contest.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><small>Use this labeled override when evidence is low-coverage, Unknown, or your judgment differs from the generated draft.</small></label>;
  if (contest.method === 'yes-no') return <label>Human contest override<select value={value?.method === 'yes-no' ? value.position : ''} onChange={(event) => onChange(event.currentTarget.value ? { method: 'yes-no', position: event.currentTarget.value as 'yes' | 'no' | 'abstain' } : null)}><option value="">Use generated draft</option><option value="yes">Yes</option><option value="no">No</option><option value="abstain">Abstain</option></select><small>This remains visibly separate from the generated result.</small></label>;
  if (contest.method === 'star') {
    if (value?.method !== 'star') return <div><p className="help">Confirm the generated official 0–5 scores, correct the research, or record a clearly visible manual STAR ballot.</p><button className="button button-secondary" onClick={() => onChange({ method: 'star', scores: Object.fromEntries(contest.options.map((option) => [option.id, 0])) })} type="button">Enter manual STAR scores</button></div>;
    return <fieldset className="manual-star"><legend>Human contest override · STAR scores</legend>{contest.options.map((option) => <label key={option.id}>{option.name}<select value={value.scores[option.id] ?? 0} onChange={(event) => onChange({ method: 'star', scores: { ...value.scores, [option.id]: Number(event.currentTarget.value) } })}>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label>)}<button className="button button-quiet" onClick={() => onChange(null)} type="button">Use generated STAR draft</button></fieldset>;
  }
  return <label>Human contest override (ordered/selected option ids)<input placeholder="Use generated draft" defaultValue={value?.method === 'rcv' ? value.rankedOptionIds.join(',') : value?.method === 'choose-up-to' ? value.selectedOptionIds.join(',') : ''} onBlur={(event) => {
    const ids = event.currentTarget.value.split(',').map((id) => id.trim()).filter((id) => contest.options.some((option) => option.id === id));
    onChange(ids.length ? contest.method === 'rcv' ? { method: 'rcv', rankedOptionIds: ids } : { method: 'choose-up-to', selectedOptionIds: ids } : null);
  }} /></label>;
}

export function ReviewPage({ profile, election, workspace, parentGuide, onDecision, onApplyReview, onContinue }: Props) {
  const ready = workspace.draft.contests.filter((contest) => contest.status === 'ready').length;
  const changes = parentGuide ? summarizeDiff(diffGuides(parentGuide, { ...parentGuide, profile, election, mapping: workspace.mapping, draft: workspace.draft, decisions: workspace.decisions })) : [];
  return <main className="page" id="main">
    <div className="page-heading"><p className="eyebrow">Draft & review</p><h1>Your explainable draft ballot</h1><p>Every option keeps its underlying 0–5 match score. The official mark translates those scores into the voting rules you verified for this election.</p></div>
    <section className="card review-overview"><div><strong>{ready}/{election.contests.length}</strong><span>contests ready</span></div><div><strong>{workspace.decisions.filter((decision) => decision.confirmed).length}/{election.contests.length}</strong><span>human confirmations</span></div><div><strong>{election.contests.filter((contest) => contest.verification.status === 'verified').length}/{election.contests.length}</strong><span>official rules verified</span></div></section>
    {parentGuide && <section className="card diff-panel"><p className="eyebrow">Compare with parent</p><h2>What your copy changes</h2>{changes.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p>No semantic changes yet.</p>}</section>}
    <div className="stack">{election.contests.map((contest) => {
      const draft = workspace.draft.contests.find((candidate) => candidate.contestId === contest.id)!;
      const decision = workspace.decisions.find((candidate) => candidate.contestId === contest.id)!;
      return <ContestReview contest={contest} decision={decision} draft={draft} key={contest.id} onDecision={(patch) => onDecision(contest.id, patch)} profile={profile} workspace={workspace} />;
    })}</div>
    <section className="card profile-next-step"><div><p className="eyebrow">Next step</p><h2>{workspace.decisions.every((decision) => decision.confirmed) ? 'Review complete' : `Confirm ${workspace.decisions.filter((decision) => !decision.confirmed).length} remaining ${workspace.decisions.filter((decision) => !decision.confirmed).length === 1 ? 'contest' : 'contests'}`}</h2><p>Low coverage, Unknown cells, and human overrides may be shared, but the publishing screen will require an explicit warning acknowledgment.</p></div><button className="button button-primary" disabled={!workspace.decisions.every((decision) => decision.confirmed)} onClick={onContinue} type="button">Continue to share</button></section>
    <details className="optional-tools card"><summary>Optional chatbot discussion</summary><HandoffPanel context={reviewContext(profile, election, workspace)} description="Discuss close calls, evidence gaps, or wording for a personal note. Suggested overrides remain visible proposals; Voting Topics never changes a ballot mark merely because a chatbot suggested one." onAccept={(proposal: Proposal, selected, toolLabel) => { if (proposal.version === 'vt.review-proposal.v1') onApplyReview(proposal, new Set([...selected].map((key) => key.replace(/^contest:/u, ''))), toolLabel); }} referenceContext={{ profile, election, workspace }} taskType="review" title="Discuss the generated draft" /></details>
  </main>;
}

function ContestReview({ contest, draft, decision, profile, workspace, onDecision }: { contest: Contest; draft: ContestDraft; decision: ContestDecision; profile: TopicProfile; workspace: ElectionWorkspace; onDecision: (patch: Partial<ContestDecision>) => void }) {
  const topics = new Map(profile.topics.map((topic) => [topic.id, topic]));
  const mapping = workspace.mapping.contests.find((candidate) => candidate.contestId === contest.id);
  return <article className="card review-card">
    <div className="review-heading"><div><p className="eyebrow">{contest.method.replace(/-/gu, ' ')} · rules {contest.verification.status}</p><h2>{contest.title}</h2></div><span className={`status status-${draft.status}`}>{draft.status.replace('-', ' ')}</span></div>
    <div className="score-grid">{draft.optionScores.map((option) => <div className="scorecard" key={option.optionId}><strong>{optionName(contest, option.optionId)}</strong><span className="big-score">{option.score.toFixed(1)}<small>/5</small></span><span>{Math.round(option.coverage * 100)}% evidence coverage</span></div>)}</div>
    <p>{draft.explanation}</p>{draft.warnings.length > 0 && <ul className="warnings">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
    <div className="official-draft"><span>Official ballot translation</span><strong>{markText(contest, decision.override ?? draft.translated)}</strong>{decision.override && <small>Human override · generated draft retained for inspection</small>}</div>
    <details><summary>Inspect priority contributions, provenance, and evidence</summary>{draft.optionScores.map((option) => <div className="evidence-block" key={option.optionId}><h3>{optionName(contest, option.optionId)}</h3>{option.contributions.map((contribution) => {
      const assessment = mapping?.assessments.find((cell) => cell.status === 'assessed' && cell.optionId === option.optionId && cell.topicId === contribution.topicId);
      return <div className="contribution" key={contribution.topicId}><strong>{topics.get(contribution.topicId)?.title}</strong><span>{contribution.voterStars} importance × {contribution.optionStars} fit × {contribution.confidence} confidence</span>{assessment?.status === 'assessed' && <><small className="provenance-badge">{assessment.authorship.kind === 'chatbot' ? 'Chatbot-proposed · human-verified' : 'Human-authored'}{assessment.authorship.toolLabel ? ` · ${assessment.authorship.toolLabel}` : ''}</small><p>{assessment.reason}</p>{assessment.sourceIds.map((id) => { const source = workspace.mapping.sources.find((candidate) => candidate.id === id); return source ? <a href={source.url} key={id} rel="noreferrer" target="_blank">{source.label}</a> : null; })}</>}</div>;
    })}</div>)}</details>
    <ManualOverride contest={contest} value={decision.override} onChange={(override) => onDecision({ override, confirmed: false })} />
    <label>Personal note (separate from calculation)<textarea defaultValue={decision.personalNote} onBlur={(event) => onDecision({ personalNote: event.currentTarget.value })} /></label>{decision.personalNote && decision.noteAuthorship && <p className="provenance-badge">{decision.noteAuthorship.kind === 'chatbot' ? 'Note drafted by chatbot · human-verified' : 'Note written by the guide author'}{decision.noteAuthorship.toolLabel ? ` · ${decision.noteAuthorship.toolLabel}` : ''}</p>}
    <label className="confirm-row"><input checked={decision.confirmed} onChange={(event) => onDecision({ confirmed: event.currentTarget.checked })} type="checkbox" /> I reviewed the evidence, generated result, official ballot translation, and any warning.</label>
  </article>;
}
