import { useState } from 'react';
import { StarsInput } from '../components/StarsInput';
import { newId, type ElectionWorkspace, type MappingAssessment, type Source, type TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  workspace: ElectionWorkspace;
  onRelevantTopics: (contestId: string, topicIds: string[]) => void;
  onSource: (source: Source) => void;
  onAssessment: (contestId: string, optionId: string, topicId: string, assessment: MappingAssessment | null) => void;
}

export function MappingEditor({ profile, workspace, onRelevantTopics, onSource, onAssessment }: Props) {
  const [activeContestId, setActiveContestId] = useState(workspace.election.contests[0]?.id ?? '');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const contest = workspace.election.contests.find((candidate) => candidate.id === activeContestId) ?? workspace.election.contests[0];
  if (!contest) return <main className="page" id="main"><h1>Add an election contest first</h1></main>;
  const contestMap = workspace.mapping.contests.find((candidate) => candidate.contestId === contest.id);
  const relevant = contestMap?.relevantTopicIds ?? [];
  const topics = profile.topics.filter((topic) => relevant.includes(topic.id));
  const cell = (optionId: string, topicId: string) => contestMap?.assessments.find((assessment) => assessment.optionId === optionId && assessment.topicId === topicId);
  const patchAssessed = (assessment: MappingAssessment, patch: Partial<Extract<MappingAssessment, { status: 'assessed' }>>) => {
    if (assessment.status !== 'assessed') return assessment;
    return { ...assessment, ...patch };
  };
  return (
    <main className="page" id="main">
      <div className="page-heading">
        <p className="eyebrow">Map · sparse, complete, cited</p>
        <h1>Map options to relevant topics</h1>
        <p>Select only materially relevant topics. Then rate <strong>every viable option</strong> on each selected topic—or mark it Unknown. Zero means cited conflict; missing evidence never becomes zero.</p>
      </div>
      <nav className="contest-tabs" aria-label="Contest to map">
        {workspace.election.contests.map((candidate) => <button aria-current={candidate.id === contest.id ? 'page' : undefined} className="chip" key={candidate.id} onClick={() => setActiveContestId(candidate.id)} type="button">{candidate.title}</button>)}
      </nav>
      <section className="card">
        <h2>1. Relevant topics for {contest.title}</h2>
        <div className="check-grid">
          {profile.topics.map((topic) => (
            <label className="check-card" key={topic.id}>
              <input checked={relevant.includes(topic.id)} onChange={(event) => onRelevantTopics(contest.id, event.currentTarget.checked ? [...relevant, topic.id] : relevant.filter((id) => id !== topic.id))} type="checkbox" />
              <span><strong>{topic.title}</strong><small>{topic.stars} importance stars{topic.category ? ` · ${topic.category}` : ''}</small></span>
            </label>
          ))}
        </div>
      </section>
      <section className="card source-panel">
        <h2>2. Reusable evidence sources</h2>
        <ul>{workspace.mapping.sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer" target="_blank">{source.label}</a></li>)}</ul>
        <div className="inline-form">
          <label>Source label<input value={sourceLabel} onChange={(event) => setSourceLabel(event.currentTarget.value)} /></label>
          <label>HTTP(S) URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} type="url" /></label>
          <button className="button button-secondary" disabled={!sourceLabel.trim() || !/^https?:\/\//u.test(sourceUrl)} onClick={() => { onSource({ id: newId('source'), label: sourceLabel.trim(), url: sourceUrl.trim() }); setSourceLabel(''); setSourceUrl(''); }} type="button">Add source</button>
        </div>
      </section>
      <section>
        <h2>3. Complete the evidence grid</h2>
        {topics.length === 0 && <p className="empty-state">Select at least one relevant topic above.</p>}
        <div className="mapping-grid">
          {contest.options.flatMap((option) => topics.map((topic) => {
            const assessment = cell(option.id, topic.id);
            return (
              <article className={`card mapping-cell ${assessment?.status ?? 'missing'}`} key={`${option.id}-${topic.id}`}>
                <p className="cell-label">{option.name} × {topic.title}</p>
                <label>Evidence state
                  <select value={assessment?.status ?? 'missing'} onChange={(event) => {
                    const status = event.currentTarget.value;
                    if (status === 'missing') onAssessment(contest.id, option.id, topic.id, null);
                    else if (status === 'unknown') onAssessment(contest.id, option.id, topic.id, { status: 'unknown', contestId: contest.id, optionId: option.id, topicId: topic.id, note: 'No reliable evidence found yet.' });
                    else {
                      const source = workspace.mapping.sources[0];
                      if (!source) { window.alert('Add an HTTP(S) source before creating an assessed fit.'); return; }
                      onAssessment(contest.id, option.id, topic.id, { status: 'assessed', contestId: contest.id, optionId: option.id, topicId: topic.id, stars: 3, confidence: 'medium', reason: 'The cited source supports this initial fit assessment.', sourceIds: [source.id] });
                    }
                  }}>
                    <option value="missing">Incomplete</option><option value="unknown">Unknown — no evidence</option><option value="assessed">Assessed with evidence</option>
                  </select>
                </label>
                {assessment?.status === 'unknown' && <label>Research note<textarea defaultValue={assessment.note ?? ''} onBlur={(event) => onAssessment(contest.id, option.id, topic.id, { ...assessment, note: event.currentTarget.value })} /></label>}
                {assessment?.status === 'assessed' && <>
                  <StarsInput label="Option fit (0 = cited conflict, 5 = strong fit)" value={assessment.stars} onChange={(stars) => onAssessment(contest.id, option.id, topic.id, patchAssessed(assessment, { stars }))} />
                  <label>Confidence<select value={assessment.confidence} onChange={(event) => onAssessment(contest.id, option.id, topic.id, patchAssessed(assessment, { confidence: event.currentTarget.value as 'low' | 'medium' | 'high' }))}><option value="low">Low · 0.5</option><option value="medium">Medium · 0.75</option><option value="high">High · 1.0</option></select></label>
                  <label>Short evidence reason<textarea defaultValue={assessment.reason} onBlur={(event) => { if (event.currentTarget.value.trim().length >= 10) onAssessment(contest.id, option.id, topic.id, patchAssessed(assessment, { reason: event.currentTarget.value.trim() })); }} /></label>
                  <label>Cited source<select value={assessment.sourceIds[0]} onChange={(event) => onAssessment(contest.id, option.id, topic.id, patchAssessed(assessment, { sourceIds: [event.currentTarget.value] }))}>{workspace.mapping.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
                </>}
              </article>
            );
          }))}
        </div>
      </section>
    </main>
  );
}
