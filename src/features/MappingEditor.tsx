import { useEffect, useState } from 'react';
import { HandoffPanel } from '../components/HandoffPanel';
import { StarsInput } from '../components/StarsInput';
import { assessmentContext, relevanceContext, type Proposal } from '../domain/handoff';
import { auditMapping } from '../domain/scoring';
import { newId, verifiedNow, type AssessmentBatch, type Confidence, type ElectionTemplate, type ElectionWorkspace, type MappingAssessment, type RelevanceProposal, type Source, type TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  election: ElectionTemplate;
  workspace: ElectionWorkspace;
  onRelevantTopics: (contestId: string, topicIds: string[]) => void;
  onApplyRelevance: (proposal: RelevanceProposal, contestIds: Set<string>, toolLabel?: string) => void;
  onApplyAssessment: (proposal: AssessmentBatch, accepted: Set<string>, toolLabel?: string) => void;
  onSource: (source: Source) => void;
  onAssessment: (contestId: string, optionId: string, topicId: string, assessment: MappingAssessment | null) => void;
  onContinue: () => void;
}

type Filter = 'all' | 'incomplete' | 'unknown' | 'imported' | 'verification';
type AssessmentDraft =
  | { kind: 'assessed'; stars: number | null; confidence: Confidence | ''; reason: string; sourceId: string }
  | { kind: 'unknown'; note: string };

export function MappingEditor({ profile, election, workspace, onRelevantTopics, onApplyRelevance, onApplyAssessment, onSource, onAssessment, onContinue }: Props) {
  const [mode, setMode] = useState<'relevance' | 'assessment'>('relevance');
  const [activeContestId, setActiveContestId] = useState(election.contests[0]?.id ?? '');
  const [activeTopicId, setActiveTopicId] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [bulkSourceId, setBulkSourceId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, AssessmentDraft>>({});
  const contest = election.contests.find((item) => item.id === activeContestId) ?? election.contests[0];
  const contestMap = workspace.mapping.contests.find((item) => item.contestId === contest?.id);
  const relevant = contestMap?.relevantTopicIds ?? [];
  const topics = profile.topics.filter((topic) => relevant.includes(topic.id) && topic.stars !== null);

  useEffect(() => {
    if (!topics.some((topic) => topic.id === activeTopicId)) setActiveTopicId(topics[0]?.id ?? '');
  }, [activeTopicId, topics]);

  const cells = contestMap?.assessments ?? [];
  const total = (contest?.options.length ?? 0) * topics.length;
  const completed = cells.filter((cell) => relevant.includes(cell.topicId)).length;
  const missing = Math.max(0, total - completed);
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const cell = (optionId: string, topicId: string) => cells.find((item) => item.optionId === optionId && item.topicId === topicId);
  const visibleOptions = (contest?.options ?? []).filter((option) => {
    if (!activeTopic) return true;
    const assessment = cell(option.id, activeTopic.id);
    if (filter === 'incomplete') return !assessment;
    if (filter === 'unknown') return assessment?.status === 'unknown';
    if (filter === 'imported') return assessment?.authorship.kind === 'chatbot';
    if (filter === 'verification') return Boolean(assessment && assessment.verification.status !== 'verified');
    return true;
  });
  const mappingProblems = auditMapping(profile, election, workspace.mapping);
  const draftKey = (optionId: string, topicId: string) => `${contest?.id ?? ''}\u0000${optionId}\u0000${topicId}`;
  const setDraft = (key: string, draft: AssessmentDraft | null) => setDrafts((current) => {
    const next = { ...current };
    if (draft) next[key] = draft; else delete next[key];
    return next;
  });
  const beginDraft = (optionId: string, topicId: string, kind: AssessmentDraft['kind']) => {
    const existing = cell(optionId, topicId);
    const draft = kind === 'unknown'
      ? { kind, note: existing?.status === 'unknown' ? existing.note ?? '' : '' } as const
      : { kind, stars: existing?.status === 'assessed' ? existing.stars : null, confidence: existing?.status === 'assessed' ? existing.confidence : '', reason: existing?.status === 'assessed' ? existing.reason : '', sourceId: existing?.status === 'assessed' ? existing.sourceIds[0] ?? '' : '' } as const;
    setDraft(draftKey(optionId, topicId), draft);
  };

  if (!contest) return <main className="page" id="main"><h1>Add an election contest first</h1></main>;

  const patchAssessed = (assessment: MappingAssessment, patch: Partial<Extract<MappingAssessment, { status: 'assessed' }>>) => assessment.status === 'assessed' ? { ...assessment, ...patch, verification: verifiedNow() } : assessment;
  const nextIncomplete = () => {
    for (const topic of topics) for (const option of contest.options) if (!cell(option.id, topic.id)) { setActiveTopicId(topic.id); document.getElementById(`assessment-${option.id}-${topic.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  };

  return <main className="page" id="main">
    <div className="page-heading"><p className="eyebrow">Pair & research · sparse, complete, cited</p><h1>Connect your priorities to this election</h1><p>First decide what each contest can materially affect. Then compare every viable option against one relevant priority at a time. Zero means evidenced conflict; missing evidence means Unknown.</p></div>

    {total === 0 ? <section className="research-progress card research-empty-progress"><div><strong>Research has not started</strong><span>Select at least one rated priority as relevant to a contest; the required option-priority cells will appear here.</span></div></section> : <section className="research-progress card"><div><strong>{completed}/{total}</strong><span>option-priority assessments complete for this contest</span></div><div className="progress-track" aria-label={`${completed} of ${total} assessments complete`} aria-valuemax={total} aria-valuemin={0} aria-valuenow={completed} role="progressbar"><span style={{ width: `${Math.round(completed / total * 100)}%` }} /></div><div><strong>{missing}</strong><span>still incomplete</span></div></section>}

    <nav className="segmented" aria-label="Pair and research stage"><button aria-current={mode === 'relevance' ? 'page' : undefined} onClick={() => setMode('relevance')} type="button">1 Relevance</button><button aria-current={mode === 'assessment' ? 'page' : undefined} onClick={() => setMode('assessment')} type="button">2 Option research</button></nav>
    <nav className="contest-tabs" aria-label="Contest to research">{election.contests.map((item) => {
      const mapping = workspace.mapping.contests.find((candidate) => candidate.contestId === item.id);
      const count = mapping?.assessments.length ?? 0;
      const expected = (mapping?.relevantTopicIds.length ?? 0) * item.options.length;
      return <button aria-current={item.id === contest.id ? 'page' : undefined} className="chip" key={item.id} onClick={() => setActiveContestId(item.id)} type="button">{item.title}<small>{count}/{expected}</small></button>;
    })}</nav>

    {mode === 'relevance' ? <>
      <section className="card relevance-panel"><div className="section-heading"><div><p className="eyebrow">Contest scope</p><h2>What can {contest.title} materially affect?</h2></div><span className="count-badge">{relevant.length} relevant</span></div><p>Select priorities based on the powers and decision at stake—not on which option you prefer. Unrated priorities cannot enter research.</p>{contestMap && <p className="provenance-badge">{contestMap.authorship.kind === 'chatbot' ? 'Chatbot-proposed · human-verified' : contestMap.authorship.kind === 'import' ? 'Imported · human-verified' : 'Human-authored'}{contestMap.authorship.toolLabel ? ` · ${contestMap.authorship.toolLabel}` : ''}</p>}<div className="check-grid">{profile.topics.map((topic) => <label className={`check-card ${topic.stars === null ? 'is-disabled' : ''}`} key={topic.id}><input checked={relevant.includes(topic.id)} disabled={topic.stars === null} onChange={(event) => onRelevantTopics(contest.id, event.currentTarget.checked ? [...relevant, topic.id] : relevant.filter((id) => id !== topic.id))} type="checkbox" /><span><strong>{topic.title}</strong><small>{topic.stars === null ? 'Unrated — return to Priorities to rate' : `${topic.stars}/5 importance`}{topic.category ? ` · ${topic.category}` : ''}</small></span></label>)}</div>{!profile.topics.length && <p className="empty-state">Add priorities before pairing this election.</p>}<button className="button button-primary" disabled={!topics.length} onClick={() => setMode('assessment')} type="button">Continue to option research</button></section>
      <details className="optional-tools card"><summary>Optional chatbot relevance discussion</summary><HandoffPanel context={relevanceContext(profile, election)} description="Ask a chatbot to propose only which priorities are materially relevant to each contest. You will review every proposed contest pairing before it changes your workspace." onAccept={(proposal: Proposal, selected, toolLabel) => { if (proposal.version === 'vt.relevance-proposal.v1') onApplyRelevance(proposal, new Set([...selected].map((key) => key.replace(/^contest:/u, ''))), toolLabel); }} referenceContext={{ profile, election, workspace }} taskType="relevance" title="Discuss contest relevance" /></details>
    </> : <>
      <section className="card source-panel"><div className="section-heading"><div><p className="eyebrow">Evidence library</p><h2>Reusable research sources</h2></div><span className="count-badge">{workspace.mapping.sources.length}</span></div><ul>{workspace.mapping.sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer" target="_blank">{source.label}</a>{source.evidenceSummary && <small>{source.evidenceSummary}</small>}</li>)}</ul><div className="inline-form"><label>Source label<input value={sourceLabel} onChange={(event) => setSourceLabel(event.currentTarget.value)} /></label><label>HTTP(S) URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} type="url" /></label><button className="button button-secondary" disabled={!sourceLabel.trim() || !/^https?:\/\//u.test(sourceUrl)} onClick={() => { onSource({ id: newId('source'), label: sourceLabel.trim(), url: sourceUrl.trim() }); setSourceLabel(''); setSourceUrl(''); }} type="button">Add source</button></div></section>

      {!topics.length ? <section className="card empty-state"><h2>Select relevant priorities first</h2><p>Return to Relevance and choose only the outcomes this contest can materially affect.</p><button className="button button-primary" onClick={() => setMode('relevance')} type="button">Choose relevant priorities</button></section> : <>
        <section className="research-toolbar card"><label>Priority to compare<select value={activeTopic?.id ?? ''} onChange={(event) => setActiveTopicId(event.currentTarget.value)}>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label><label>Show<select value={filter} onChange={(event) => setFilter(event.currentTarget.value as Filter)}><option value="all">All options</option><option value="incomplete">Incomplete only</option><option value="unknown">Unknown only</option><option value="imported">Chatbot-proposed, verified</option><option value="verification">Verification needed</option></select></label><button className="button button-secondary" disabled={!missing} onClick={nextIncomplete} type="button">Next incomplete</button><div className="bulk-source"><label>Assign one source to assessed options<select value={bulkSourceId} onChange={(event) => setBulkSourceId(event.currentTarget.value)}><option value="">Choose source</option>{workspace.mapping.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label><button className="button button-secondary" disabled={!bulkSourceId || !activeTopic} onClick={() => { if (!activeTopic) return; for (const option of contest.options) { const assessment = cell(option.id, activeTopic.id); if (assessment?.status === 'assessed' && assessment.sourceIds.length < 5 && !assessment.sourceIds.includes(bulkSourceId)) onAssessment(contest.id, option.id, activeTopic.id, patchAssessed(assessment, { sourceIds: [...assessment.sourceIds, bulkSourceId] })); } }} type="button">Assign to current assessed claims</button></div></section>
        <section className="comparison-workspace"><div className="comparison-heading"><p className="eyebrow">Compare every option on one priority</p><h2>{activeTopic?.title}</h2><p>Your importance: {activeTopic?.stars}/5. Nothing counts as complete until you explicitly save an evidence assessment or record Unknown.</p></div><div className="option-comparison-grid">{visibleOptions.map((option) => {
          const assessment = activeTopic ? cell(option.id, activeTopic.id) : undefined;
          if (!activeTopic) return null;
          const key = draftKey(option.id, activeTopic.id);
          const draft = drafts[key];
          const assessedReady = draft?.kind === 'assessed' && draft.stars !== null && Boolean(draft.confidence) && draft.reason.trim().length >= 10 && Boolean(draft.sourceId);
          return <article className={`card option-assessment ${assessment?.status ?? 'missing'}`} id={`assessment-${option.id}-${activeTopic.id}`} key={option.id}>
            <div className="assessment-heading"><div><p className="eyebrow">{option.party ?? 'Ballot option'}</p><h3>{option.name}</h3></div><span className={`status status-${assessment ? assessment.status === 'unknown' ? 'close-call' : 'ready' : 'research-needed'}`}>{assessment?.status ?? 'incomplete'}</span></div>
            {assessment ? <div className="saved-assessment"><p><strong>Saved and human verified.</strong> {assessment.status === 'unknown' ? `Unknown${assessment.note ? ` — ${assessment.note}` : ''}` : `${assessment.stars}/5 fit · ${assessment.confidence} confidence — ${assessment.reason}`}</p>{assessment.authorship.kind === 'chatbot' && <p className="provenance-badge">Chatbot-proposed · human-verified{assessment.authorship.toolLabel ? ` · ${assessment.authorship.toolLabel}` : ''}</p>}</div> : <p className="help">Incomplete. Choose how to address this cell; opening an editor does not save anything.</p>}
            {!draft && <div className="button-row"><button className="button button-secondary" disabled={!workspace.mapping.sources.length} onClick={() => beginDraft(option.id, activeTopic.id, 'assessed')} type="button">Assess with evidence</button><button className="button button-secondary" onClick={() => beginDraft(option.id, activeTopic.id, 'unknown')} type="button">Record Unknown</button>{assessment && <button className="button button-quiet" onClick={() => beginDraft(option.id, activeTopic.id, assessment.status)} type="button">Edit saved assessment</button>}{assessment && <button className="button button-quiet danger" onClick={() => { if (window.confirm('Clear this saved assessment and mark the cell incomplete?')) onAssessment(contest.id, option.id, activeTopic.id, null); }} type="button">Clear saved assessment</button>}</div>}
            {!draft && !workspace.mapping.sources.length && <p className="help">Add an HTTP(S) source above to assess with evidence. You may still explicitly record Unknown.</p>}
            {draft?.kind === 'unknown' && <div className="assessment-draft"><p className="draft-badge">Unsaved Unknown draft</p><label>Research note (optional)<textarea value={draft.note} onChange={(event) => setDraft(key, { ...draft, note: event.currentTarget.value })} placeholder="What did you check, or what evidence is missing?" /></label><div className="button-row"><button className="button button-primary" onClick={() => { onAssessment(contest.id, option.id, activeTopic.id, { status: 'unknown', contestId: contest.id, optionId: option.id, topicId: activeTopic.id, note: draft.note.trim() || undefined, authorship: { kind: 'human' }, verification: verifiedNow() }); setDraft(key, null); }} type="button">Record Unknown · human verified</button><button className="button button-quiet" onClick={() => setDraft(key, null)} type="button">Cancel draft</button></div></div>}
            {draft?.kind === 'assessed' && <div className="assessment-draft"><p className="draft-badge">Unsaved evidence assessment</p><StarsInput label="Option fit (0 = evidenced conflict, 5 = strong fit)" value={draft.stars} onChange={(stars) => setDraft(key, { ...draft, stars })} /><label>Confidence<select value={draft.confidence} onChange={(event) => setDraft(key, { ...draft, confidence: event.currentTarget.value as Confidence })}><option value="">Choose confidence</option><option value="low">Low · 0.5</option><option value="medium">Medium · 0.75</option><option value="high">High · 1.0</option></select></label><label>Evidence reason (at least 10 characters)<textarea value={draft.reason} onChange={(event) => setDraft(key, { ...draft, reason: event.currentTarget.value })} /></label><label>Cited source<select value={draft.sourceId} onChange={(event) => setDraft(key, { ...draft, sourceId: event.currentTarget.value })}><option value="">Choose a source</option>{workspace.mapping.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label><div className="button-row"><button className="button button-primary" disabled={!assessedReady} onClick={() => { if (!assessedReady || draft.stars === null || !draft.confidence) return; onAssessment(contest.id, option.id, activeTopic.id, { status: 'assessed', contestId: contest.id, optionId: option.id, topicId: activeTopic.id, stars: draft.stars, confidence: draft.confidence, reason: draft.reason.trim(), sourceIds: [draft.sourceId], authorship: { kind: 'human' }, verification: verifiedNow() }); setDraft(key, null); }} type="button">Save assessment · human verified</button><button className="button button-quiet" onClick={() => setDraft(key, null)} type="button">Cancel draft</button></div></div>}
          </article>;
        })}</div>{!visibleOptions.length && <p className="empty-state">No options match this filter.</p>}</section>
      </>}
      <details className="optional-tools card"><summary>Optional chatbot evidence research</summary><HandoffPanel context={assessmentContext(profile, election, workspace, contest.id)} description="Export this contest’s options, relevant priorities, and existing sources. Ask your chatbot to research every required pair; Voting Topics rejects missing cells and unknown ids before showing a verification queue." onAccept={(proposal: Proposal, selected, toolLabel) => { if (proposal.version === 'vt.assessment-batch.v1') onApplyAssessment(proposal, selected, toolLabel); }} referenceContext={{ profile, election, workspace }} taskType="assessment" title={`Research ${contest.title}`} /></details>
    </>}
    <section className="card profile-next-step"><div><p className="eyebrow">Next step</p><h2>{mappingProblems.length ? `${mappingProblems.length} research ${mappingProblems.length === 1 ? 'requirement remains' : 'requirements remain'}` : 'Research is complete enough to review'}</h2><p>{mappingProblems.length ? 'Every relevant option-priority pair needs an explicitly saved assessment or Unknown. Low coverage is allowed later with a visible warning.' : 'All required cells are explicitly addressed. Continue to inspect scores, warnings, and any human override.'}</p></div><button className="button button-primary" disabled={mappingProblems.length > 0} onClick={onContinue} type="button">Continue to draft & review</button></section>
  </main>;
}
