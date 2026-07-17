import { useMemo, useState } from 'react';
import { diffGuides, summarizeDiff } from '../domain/diff';
import { buildPeerGuideUrl, createPeerGuide, guideJson } from '../domain/share';
import type { BallotMark, Contest, ContestDecision, ContestDraft, ElectionWorkspace, PeerGuide, TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  workspace: ElectionWorkspace;
  parentGuide: PeerGuide | null;
  onDecision: (contestId: string, patch: Partial<ContestDecision>) => void;
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
  if (contest.method === 'fptp') return <label>Contest-only override<select value={value?.method === 'fptp' ? value.selectedOptionIds[0] ?? '' : ''} onChange={(event) => onChange(event.currentTarget.value ? { method: 'fptp', selectedOptionIds: [event.currentTarget.value] } : null)}><option value="">Use generated draft</option>{contest.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
  if (contest.method === 'yes-no') return <label>Contest-only override<select value={value?.method === 'yes-no' ? value.position : ''} onChange={(event) => onChange(event.currentTarget.value ? { method: 'yes-no', position: event.currentTarget.value as 'yes' | 'no' | 'abstain' } : null)}><option value="">Use generated draft</option><option value="yes">Yes</option><option value="no">No</option><option value="abstain">Abstain</option></select></label>;
  if (contest.method === 'star') {
    if (value?.method !== 'star') return <div><p className="help">Confirm the generated official 0–5 scores, correct the mapping, or record a clearly visible manual STAR ballot.</p><button className="button button-secondary" onClick={() => onChange({ method: 'star', scores: Object.fromEntries(contest.options.map((option) => [option.id, 0])) })} type="button">Enter manual STAR scores</button></div>;
    return <fieldset className="manual-star"><legend>Manual contest-only STAR override</legend>{contest.options.map((option) => <label key={option.id}>{option.name}<select value={value.scores[option.id] ?? 0} onChange={(event) => onChange({ method: 'star', scores: { ...value.scores, [option.id]: Number(event.currentTarget.value) } })}>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label>)}<button className="button button-quiet" onClick={() => onChange(null)} type="button">Use generated STAR draft</button></fieldset>;
  }
  return <label>Contest-only override (ordered/selected option ids)<input placeholder="Use generated draft" defaultValue={value?.method === 'rcv' ? value.rankedOptionIds.join(',') : value?.method === 'choose-up-to' ? value.selectedOptionIds.join(',') : ''} onBlur={(event) => {
    const ids = event.currentTarget.value.split(',').map((id) => id.trim()).filter((id) => contest.options.some((option) => option.id === id));
    onChange(ids.length ? contest.method === 'rcv' ? { method: 'rcv', rankedOptionIds: ids } : { method: 'choose-up-to', selectedOptionIds: ids } : null);
  }} /></label>;
}

export function ReviewPage({ profile, workspace, parentGuide, onDecision }: Props) {
  const [author, setAuthor] = useState(profile.ownerLabel ?? 'A friend');
  const [shareUrl, setShareUrl] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const allConfirmed = workspace.decisions.length === workspace.election.contests.length && workspace.decisions.every((decision) => decision.confirmed);
  const previewDiff = useMemo(() => parentGuide ? {
    ...parentGuide,
    profile,
    election: workspace.election,
    mapping: workspace.mapping,
    draft: workspace.draft,
    decisions: workspace.decisions,
  } as PeerGuide : null, [parentGuide, profile, workspace]);
  const changes = previewDiff && parentGuide ? summarizeDiff(diffGuides(parentGuide, previewDiff)) : [];
  const publish = async () => {
    try {
      const guide = await createPeerGuide(profile, workspace, author.trim() || 'A friend', { parent: parentGuide, changesFromParent: changes });
      const result = buildPeerGuideUrl(guide, window.location.href.split('#')[0]);
      setShareUrl(result.url);
      setShareMessage(result.withinTarget ? 'Snapshot is within the 4,000-character pilot target.' : 'Snapshot works but exceeds the target; monitor pilot reliability.');
    } catch (cause) { setShareMessage(cause instanceof Error ? cause.message : 'Could not build the snapshot.'); }
  };
  const downloadGuide = async () => {
    const guide = await createPeerGuide(profile, workspace, author.trim() || 'A friend', { parent: parentGuide, changesFromParent: changes });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([guideJson(guide)], { type: 'application/json' }));
    anchor.download = 'peer-sample-ballot.json'; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  return (
    <main className="page" id="main">
      <div className="page-heading"><p className="eyebrow">Generate · review · share</p><h1>Explainable draft ballot</h1><p>The 0–5 scorecard stays visible for every method. The official draft below translates those scores into this election’s actual ballot rules.</p></div>
      {parentGuide && <section className="card diff-panel"><h2>What changed from {parentGuide.authorLabel}’s snapshot</h2>{changes.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p>No semantic changes yet.</p>}</section>}
      <div className="stack">
        {workspace.election.contests.map((contest) => {
          const draft = workspace.draft.contests.find((candidate) => candidate.contestId === contest.id)!;
          const decision = workspace.decisions.find((candidate) => candidate.contestId === contest.id)!;
          return <ContestReview contest={contest} decision={decision} draft={draft} key={contest.id} onDecision={(patch) => onDecision(contest.id, patch)} profile={profile} workspace={workspace} />;
        })}
      </div>
      <section className="card publish-panel">
        <h2>Immutable snapshot</h2>
        <p>{allConfirmed ? 'Every contest has an explicit human confirmation.' : 'Confirm every contest before sharing. Research-needed contests may still be manually chosen, but remain labeled as insufficient evidence.'}</p>
        <label>Author label<input value={author} onChange={(event) => setAuthor(event.currentTarget.value)} /></label>
        <div className="button-row"><button className="button button-primary" disabled={!allConfirmed} onClick={publish} type="button">Create share snapshot</button><button className="button button-secondary" disabled={!allConfirmed} onClick={downloadGuide} type="button">Export JSON</button><button className="button button-secondary" onClick={() => window.print()} type="button">Print / save PDF</button></div>
        {shareMessage && <p className="notice notice-success" role="status">{shareMessage}</p>}
        {shareUrl && <div className="share-result"><label>Self-contained review link<textarea readOnly value={shareUrl} /></label><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setShareMessage('Copied the immutable snapshot link.'); } catch { setShareMessage('Clipboard access failed. Select and copy the link above.'); } }} type="button">Copy link</button></div>}
      </section>
    </main>
  );
}

function ContestReview({ contest, draft, decision, profile, workspace, onDecision }: { contest: Contest; draft: ContestDraft; decision: ContestDecision; profile: TopicProfile; workspace: ElectionWorkspace; onDecision: (patch: Partial<ContestDecision>) => void }) {
  const topics = new Map(profile.topics.map((topic) => [topic.id, topic]));
  const mapping = workspace.mapping.contests.find((candidate) => candidate.contestId === contest.id);
  return <article className="card review-card">
    <div className="review-heading"><div><p className="eyebrow">{contest.method.replace(/-/gu, ' ')}</p><h2>{contest.title}</h2></div><span className={`status status-${draft.status}`}>{draft.status.replace('-', ' ')}</span></div>
    <div className="score-grid">{draft.optionScores.map((option) => <div className="scorecard" key={option.optionId}><strong>{optionName(contest, option.optionId)}</strong><span className="big-score">{option.score.toFixed(1)}<small>/5</small></span><span>{Math.round(option.coverage * 100)}% evidence coverage</span></div>)}</div>
    <p>{draft.explanation}</p>
    {draft.warnings.length > 0 && <ul className="warnings">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
    <div className="official-draft"><span>Official ballot translation</span><strong>{markText(contest, decision.override ?? draft.translated)}</strong>{decision.override && <small>Human override · generated draft retained for inspection</small>}</div>
    <details><summary>Inspect topic contributions and evidence</summary>{draft.optionScores.map((option) => <div className="evidence-block" key={option.optionId}><h3>{optionName(contest, option.optionId)}</h3>{option.contributions.map((contribution) => {
      const assessment = mapping?.assessments.find((cell) => cell.status === 'assessed' && cell.optionId === option.optionId && cell.topicId === contribution.topicId);
      return <div className="contribution" key={contribution.topicId}><strong>{topics.get(contribution.topicId)?.title}</strong><span>{contribution.voterStars} importance × {contribution.optionStars} fit × {contribution.confidence} confidence</span>{assessment?.status === 'assessed' && <><p>{assessment.reason}</p>{assessment.sourceIds.map((id) => { const source = workspace.mapping.sources.find((candidate) => candidate.id === id); return source ? <a href={source.url} key={id} rel="noreferrer" target="_blank">{source.label}</a> : null; })}</>}</div>;
    })}</div>)}</details>
    <ManualOverride contest={contest} value={decision.override} onChange={(override) => onDecision({ override, confirmed: false })} />
    <label>Personal note (separate from calculation)<textarea defaultValue={decision.personalNote} onBlur={(event) => onDecision({ personalNote: event.currentTarget.value })} /></label>
    <label className="confirm-row"><input checked={decision.confirmed} onChange={(event) => onDecision({ confirmed: event.currentTarget.checked })} type="checkbox" /> I reviewed the generated evidence and official ballot translation{draft.status !== 'ready' ? ', including its warning' : ''}.</label>
  </article>;
}
