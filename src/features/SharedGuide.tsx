import { useState } from 'react';
import type { BallotMark, Contest, PeerGuide } from '../domain/schema';

interface Props {
  guide: PeerGuide;
  onFork: (authorLabel: string) => void;
}

function markText(contest: Contest, mark: BallotMark | null): string {
  const name = (id: string) => contest.options.find((option) => option.id === id)?.name ?? id;
  if (!mark) return 'No generated recommendation';
  if (mark.method === 'fptp' || mark.method === 'choose-up-to') return mark.selectedOptionIds.map(name).join(', ') || 'No selection';
  if (mark.method === 'rcv') return mark.rankedOptionIds.map((id, index) => `${index + 1}. ${name(id)}`).join(' · ');
  if (mark.method === 'star') return Object.entries(mark.scores).map(([id, score]) => `${name(id)} ${score}/5`).join(' · ');
  return mark.position.toUpperCase();
}

export function SharedGuide({ guide, onFork }: Props) {
  const [author, setAuthor] = useState('My copy');
  const sourceMap = new Map(guide.mapping.sources.map((source) => [source.id, source]));
  const topicMap = new Map(guide.profile.topics.map((topic) => [topic.id, topic]));
  return (
    <main className="page shared-page" id="main">
      <div className="page-heading">
        <p className="eyebrow">Immutable peer snapshot · read only</p>
        <h1>{guide.election.title}</h1>
        <p>Shared by <strong>{guide.authorLabel}</strong>. Digest <code>{guide.snapshotDigest.slice(0, 12)}…</code>. Inspect the score, evidence, translation, and any human override before making your own copy.</p>
        {guide.lineage.parentSnapshotDigest && <p className="lineage">Forked from {guide.lineage.parentAuthorLabel ?? 'another peer'} · {guide.lineage.changesFromParent.length ? guide.lineage.changesFromParent.join(' · ') : 'no change summary supplied'}</p>}
      </div>
      <div className="stack">
        {guide.election.contests.map((contest) => {
          const draft = guide.draft.contests.find((candidate) => candidate.contestId === contest.id)!;
          const decision = guide.decisions.find((candidate) => candidate.contestId === contest.id);
          const mapping = guide.mapping.contests.find((candidate) => candidate.contestId === contest.id);
          return <article className="card review-card" key={contest.id}>
            <div className="review-heading"><div><p className="eyebrow">{contest.method.replace(/-/gu, ' ')}</p><h2>{contest.title}</h2></div><span className={`status status-${draft.status}`}>{draft.status.replace('-', ' ')}</span></div>
            <div className="official-draft"><span>{decision?.override ? 'Final ballot · human override' : 'Generated official ballot'}</span><strong>{markText(contest, decision?.override ?? draft.translated)}</strong></div>
            <div className="score-grid">{draft.optionScores.map((option) => <div className="scorecard" key={option.optionId}><strong>{contest.options.find((candidate) => candidate.id === option.optionId)?.name}</strong><span className="big-score">{option.score.toFixed(1)}<small>/5</small></span><span>{Math.round(option.coverage * 100)}% coverage</span></div>)}</div>
            <p>{draft.explanation}</p>
            {decision?.personalNote && <blockquote>{decision.personalNote}</blockquote>}
            <details><summary>Inspect cited option/topic assessments</summary>{mapping?.assessments.map((assessment) => <div className="contribution" key={`${assessment.optionId}-${assessment.topicId}`}><strong>{contest.options.find((option) => option.id === assessment.optionId)?.name} × {topicMap.get(assessment.topicId)?.title}</strong>{assessment.status === 'unknown' ? <span>Unknown — {assessment.note ?? 'no reliable evidence found'}</span> : <><span>{assessment.stars}/5 fit · {assessment.confidence} confidence</span><p>{assessment.reason}</p>{assessment.sourceIds.map((id) => sourceMap.get(id)).filter(Boolean).map((source) => <a href={source!.url} key={source!.id} rel="noreferrer" target="_blank">{source!.label}</a>)}</>}</div>)}</details>
          </article>;
        })}
      </div>
      <aside className="card fork-panel">
        <h2>Make it yours</h2>
        <p>Your copy preserves this snapshot as its parent, keeps existing local work, and becomes independently editable. There is no canonical group mapping.</p>
        <label>Your author label<input value={author} onChange={(event) => setAuthor(event.currentTarget.value)} /></label>
        <button className="button button-primary" disabled={!author.trim()} onClick={() => onFork(author.trim())} type="button">Make my copy</button>
      </aside>
    </main>
  );
}
