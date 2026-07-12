import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { DEMO_TEMPLATE } from './guide/demo';
import { downloadTextFile, safeFilename } from './guide/files';
import {
  ElectionTemplateSchema,
  VoterGuideDraftSchema,
  guideReadinessMessages,
  isContestComplete,
  newId,
  type CandidateContest,
  type CandidateRecommendation,
  type Contest,
  type GuideSource,
  type Recommendation,
  type VoterGuideDraft,
  type VoterGuidePublished,
} from './guide/schema';
import { buildGuideReviewUrl, readGuideReviewUrl } from './guide/share';
import { readLegacyData, useGuideStore } from './guide/store';

type Route =
  | { screen: 'home' }
  | { screen: 'edit' }
  | { screen: 'review'; source: 'local' }
  | { screen: 'review'; source: 'shared'; guide: VoterGuidePublished };

type Notice = { kind: 'error' | 'success'; text: string } | null;

function formatElectionDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
    new Date(`${date}T12:00:00`),
  );
}

function replaceRecommendation(
  guide: VoterGuideDraft,
  contestId: string,
  update: (recommendation: Recommendation) => Recommendation,
): VoterGuideDraft {
  return {
    ...guide,
    recommendations: guide.recommendations.map((recommendation) =>
      recommendation.contestId === contestId ? update(recommendation) : recommendation,
    ),
  };
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      {notice.text}
    </div>
  );
}

function FictionBanner({ guide }: { guide: VoterGuideDraft }) {
  if (!guide.template.isFictional) return null;
  return (
    <aside className="fiction-banner" aria-label="Fictional election notice">
      <strong>Fictional demo election.</strong> {guide.template.disclaimer}
    </aside>
  );
}

function AppHeader({ route, onHome }: { route: Route; onHome: () => void }) {
  const context =
    route.screen === 'edit'
      ? 'Editing guide'
      : route.screen === 'review'
        ? route.source === 'shared'
          ? 'Shared review'
          : 'Guide review'
        : 'Private voter-guide builder';
  return (
    <header className="app-header no-print">
      <button className="brand-button" type="button" onClick={onHome} aria-label="Trusted Voter Guide home">
        Trusted Voter Guide
      </button>
      <span className="header-context">{context}</span>
    </header>
  );
}

interface HomeProps {
  draft: VoterGuideDraft | null;
  legacyData: string | null;
  legacyDismissed: boolean;
  onStartDemo: () => void;
  onResume: () => void;
  onImportTemplate: (file: File) => void;
  onImportGuide: (file: File) => void;
  onDownloadLegacy: () => void;
  onDismissLegacy: () => void;
}

function Home({
  draft,
  legacyData,
  legacyDismissed,
  onStartDemo,
  onResume,
  onImportTemplate,
  onImportGuide,
  onDownloadLegacy,
  onDismissLegacy,
}: HomeProps) {
  const templateInput = useRef<HTMLInputElement>(null);
  const guideInput = useRef<HTMLInputElement>(null);
  const passFile = (event: ChangeEvent<HTMLInputElement>, handler: (file: File) => void) => {
    const [file] = event.currentTarget.files ?? [];
    if (file) handler(file);
    event.currentTarget.value = '';
  };

  return (
    <main className="page home-page" id="main-content">
      <section className="hero">
        <p className="eyebrow">Explain your vote, not just your picks</p>
        <h1>Make a voter guide your friends can trust.</h1>
        <p className="hero-copy">
          Record clear recommendations, the outcomes you want, and your reasoning. Share a private link
          that keeps the whole guide in the URL—no account or server upload required.
        </p>
        <div className="primary-actions">
          {draft ? (
            <button className="button button-primary" type="button" onClick={onResume}>
              Resume saved guide
            </button>
          ) : null}
          <button className={draft ? 'button button-secondary' : 'button button-primary'} type="button" onClick={onStartDemo}>
            Start fictional demo
          </button>
        </div>
      </section>

      {legacyData && !legacyDismissed ? (
        <section className="legacy-notice" aria-labelledby="legacy-heading">
          <div>
            <h2 id="legacy-heading">Your earlier Voting Topics data is still here</h2>
            <p>
              This version uses a new guide format. It will not alter or migrate the older <code>vt.m2</code>{' '}
              data, but you can download the raw backup now.
            </p>
          </div>
          <div className="button-row">
            <button className="button button-secondary" type="button" onClick={onDownloadLegacy}>
              Download legacy backup
            </button>
            <button className="button button-quiet" type="button" onClick={onDismissLegacy}>
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      <section className="home-grid" aria-label="Other ways to start">
        <article className="home-card">
          <h2>Import an election</h2>
          <p>Load a validated <code>vt.election-template.v1</code> JSON file, then add your recommendations.</p>
          <input
            ref={templateInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => passFile(event, onImportTemplate)}
            aria-label="Election template file"
          />
          <button className="button button-secondary" type="button" onClick={() => templateInput.current?.click()}>
            Import election template
          </button>
        </article>
        <article className="home-card">
          <h2>Open a guide file</h2>
          <p>Continue from a portable <code>vt.guide.v1</code> JSON backup without sending it anywhere.</p>
          <input
            ref={guideInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => passFile(event, onImportGuide)}
            aria-label="Voter guide file"
          />
          <button className="button button-secondary" type="button" onClick={() => guideInput.current?.click()}>
            Import voter guide
          </button>
        </article>
      </section>

      <section className="privacy-card">
        <h2>Private by construction</h2>
        <p>
          Drafts stay in this browser. Review links contain a compressed copy after <code>#guide=</code>; the
          browser does not send that fragment to a web server. Anyone with the link can still read it, so share
          it with the same care as a document.
        </p>
      </section>
    </main>
  );
}

function ValueEditor({ guide, onChange }: { guide: VoterGuideDraft; onChange: (guide: VoterGuideDraft) => void }) {
  const referenced = useMemo(
    () =>
      new Map(
        guide.values.map((value) => [
          value.id,
          guide.recommendations.filter((recommendation) => recommendation.valueIds.includes(value.id)).length,
        ]),
      ),
    [guide],
  );
  if (guide.values.length === 0) return null;
  return (
    <section className="values-overview" aria-labelledby="values-heading">
      <h2 id="values-heading">Your desired outcomes</h2>
      <p>Reuse these statements across contests. Outcomes linked to a recommendation cannot be deleted.</p>
      <ul className="value-list">
        {guide.values.map((value) => {
          const count = referenced.get(value.id) ?? 0;
          return (
            <li key={value.id}>
              <span>{value.text}</span>
              <button
                type="button"
                className="text-button"
                disabled={count > 0}
                title={count > 0 ? `Linked to ${count} recommendation${count === 1 ? '' : 's'}` : undefined}
                onClick={() => onChange({ ...guide, values: guide.values.filter((item) => item.id !== value.id) })}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecommendationChoice({
  contest,
  recommendation,
  onChange,
}: {
  contest: Contest;
  recommendation: Recommendation;
  onChange: (recommendation: Recommendation) => void;
}) {
  if (contest.kind === 'candidate' && recommendation.kind === 'candidate') {
    return (
      <CandidateChoice contest={contest} recommendation={recommendation} onChange={onChange} />
    );
  }
  if (contest.kind === 'measure' && recommendation.kind === 'measure') {
    return (
      <fieldset className="choice-fieldset">
        <legend>Your recommendation</legend>
        <div className="measure-options">
          {(['yes', 'no', 'abstain'] as const).map((position) => (
            <label key={position} className="choice-option">
              <input
                type="radio"
                name={`position-${contest.id}`}
                checked={recommendation.position === position}
                onChange={() => onChange({ ...recommendation, position })}
              />
              <span>{position[0].toUpperCase() + position.slice(1)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return <p role="alert">This recommendation does not match its election contest.</p>;
}

function CandidateChoice({
  contest,
  recommendation,
  onChange,
}: {
  contest: CandidateContest;
  recommendation: CandidateRecommendation;
  onChange: (recommendation: CandidateRecommendation) => void;
}) {
  const chooseOne = contest.selectionRule === 'choose-one';
  return (
    <fieldset className="choice-fieldset">
      <legend>Your recommendation</legend>
      <p className="field-help">
        {chooseOne ? 'Choose one candidate.' : `Choose up to ${contest.maxSelections} candidates.`} Ratings are
        optional and never make the choice for you.
      </p>
      <div className="candidate-options">
        {contest.candidates.map((candidate) => {
          const selected = recommendation.candidateIds.includes(candidate.id);
          const maxReached = !selected && recommendation.candidateIds.length >= contest.maxSelections;
          return (
            <div className={`candidate-option${selected ? ' is-selected' : ''}`} key={candidate.id}>
              <label className="candidate-pick">
                <input
                  type={chooseOne ? 'radio' : 'checkbox'}
                  name={chooseOne ? `candidate-${contest.id}` : undefined}
                  checked={selected}
                  disabled={!chooseOne && maxReached}
                  aria-label={`Recommend ${candidate.name} for ${contest.title}`}
                  onChange={() => {
                    const candidateIds = chooseOne
                      ? [candidate.id]
                      : selected
                        ? recommendation.candidateIds.filter((id) => id !== candidate.id)
                        : [...recommendation.candidateIds, candidate.id];
                    onChange({ ...recommendation, candidateIds });
                  }}
                />
                <span>
                  <strong>{candidate.name}</strong>
                  {candidate.party ? <small>{candidate.party}</small> : null}
                </span>
              </label>
              <div className="rating-control" aria-label={`Personal fit rating for ${candidate.name}`}>
                <span>Personal fit</span>
                <div className="rating-buttons">
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <button
                      type="button"
                      key={rating}
                      className={recommendation.ratings[candidate.id] === rating ? 'is-active' : ''}
                      aria-label={`Rate ${candidate.name} ${rating} out of 5`}
                      aria-pressed={recommendation.ratings[candidate.id] === rating}
                      onClick={() =>
                        onChange({
                          ...recommendation,
                          ratings: { ...recommendation.ratings, [candidate.id]: rating },
                        })
                      }
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function ValuesForContest({
  guide,
  recommendation,
  contest,
  onGuideChange,
}: {
  guide: VoterGuideDraft;
  recommendation: Recommendation;
  contest: Contest;
  onGuideChange: (guide: VoterGuideDraft) => void;
}) {
  const [newValue, setNewValue] = useState('');
  const updateRecommendation = (next: Recommendation) =>
    onGuideChange(replaceRecommendation(guide, contest.id, () => next));
  const addValue = () => {
    const text = newValue.trim();
    if (!text) return;
    const existing = guide.values.find((value) => value.text.toLocaleLowerCase() === text.toLocaleLowerCase());
    const value = existing ?? { id: newId('value'), text };
    onGuideChange({
      ...replaceRecommendation(guide, contest.id, (item) => ({
        ...item,
        valueIds: item.valueIds.includes(value.id) ? item.valueIds : [...item.valueIds, value.id],
      })),
      values: existing ? guide.values : [...guide.values, value],
    });
    setNewValue('');
  };

  return (
    <fieldset className="values-fieldset">
      <legend>Desired outcomes</legend>
      <p className="field-help">Link at least one concrete result you want this recommendation to advance.</p>
      {guide.values.length > 0 ? (
        <div className="value-options">
          {guide.values.map((value) => (
            <label key={value.id} className="value-option">
              <input
                type="checkbox"
                checked={recommendation.valueIds.includes(value.id)}
                onChange={() =>
                  updateRecommendation({
                    ...recommendation,
                    valueIds: recommendation.valueIds.includes(value.id)
                      ? recommendation.valueIds.filter((id) => id !== value.id)
                      : [...recommendation.valueIds, value.id],
                  })
                }
              />
              <span>{value.text}</span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="inline-add">
        <label>
          <span>Add or reuse an outcome</span>
          <input
            value={newValue}
            maxLength={240}
            aria-label={`Desired outcome for ${contest.title}`}
            placeholder="e.g. Safer crossings near schools"
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addValue();
              }
            }}
          />
        </label>
        <button className="button button-secondary button-small" type="button" onClick={addValue} disabled={!newValue.trim()}>
          Add and link
        </button>
      </div>
    </fieldset>
  );
}

function SourcesEditor({
  contest,
  recommendation,
  onChange,
}: {
  contest: Contest;
  recommendation: Recommendation;
  onChange: (recommendation: Recommendation) => void;
}) {
  const updateSource = (sourceId: string, patch: Partial<GuideSource>) =>
    onChange({
      ...recommendation,
      sources: recommendation.sources.map((source) =>
        source.id === sourceId ? { ...source, ...patch } : source,
      ),
    });
  return (
    <fieldset className="sources-fieldset">
      <legend>Sources <span>(optional)</span></legend>
      {recommendation.sources.map((source, index) => (
        <div className="source-row" key={source.id}>
          <label>
            <span>Source label</span>
            <input
              value={source.label}
              aria-label={`Source ${index + 1} label for ${contest.title}`}
              onChange={(event) => updateSource(source.id, { label: event.target.value })}
            />
          </label>
          <label>
            <span>Source URL</span>
            <input
              type="url"
              value={source.url}
              aria-label={`Source ${index + 1} URL for ${contest.title}`}
              placeholder="https://…"
              onChange={(event) => updateSource(source.id, { url: event.target.value })}
            />
          </label>
          <button
            className="text-button source-remove"
            type="button"
            onClick={() =>
              onChange({
                ...recommendation,
                sources: recommendation.sources.filter((item) => item.id !== source.id),
              })
            }
          >
            Remove source
          </button>
        </div>
      ))}
      {recommendation.sources.length < 5 ? (
        <button
          className="button button-quiet button-small"
          type="button"
          onClick={() =>
            onChange({
              ...recommendation,
              sources: [...recommendation.sources, { id: newId('source'), label: '', url: '' }],
            })
          }
        >
          Add source
        </button>
      ) : null}
    </fieldset>
  );
}

function ContestEditor({
  contest,
  guide,
  number,
  onGuideChange,
}: {
  contest: Contest;
  guide: VoterGuideDraft;
  number: number;
  onGuideChange: (guide: VoterGuideDraft) => void;
}) {
  const recommendation = guide.recommendations.find((item) => item.contestId === contest.id);
  if (!recommendation) return <p role="alert">Missing recommendation for {contest.title}.</p>;
  const updateRecommendation = (next: Recommendation) =>
    onGuideChange(replaceRecommendation(guide, contest.id, () => next));
  const complete = isContestComplete(guide, contest.id);
  return (
    <article className="contest-card" data-testid={`contest-${contest.id}`}>
      <header className="contest-heading">
        <div>
          <p className="contest-number">Contest {number}</p>
          <h2>{contest.title}</h2>
          {contest.description ? <p>{contest.description}</p> : null}
        </div>
        <span className={`completion-pill${complete ? ' is-complete' : ''}`}>
          {complete ? 'Complete' : 'Needs work'}
        </span>
      </header>

      <RecommendationChoice contest={contest} recommendation={recommendation} onChange={updateRecommendation} />

      <label className="rationale-field">
        <span>Why do you recommend this?</span>
        <textarea
          value={recommendation.rationale}
          maxLength={3000}
          aria-label={`Rationale for ${contest.title}`}
          placeholder="Explain the evidence and tradeoffs in your own words (at least 20 characters)."
          onChange={(event) => updateRecommendation({ ...recommendation, rationale: event.target.value })}
        />
      </label>

      <ValuesForContest
        guide={guide}
        recommendation={recommendation}
        contest={contest}
        onGuideChange={onGuideChange}
      />
      <SourcesEditor contest={contest} recommendation={recommendation} onChange={updateRecommendation} />
    </article>
  );
}

function GuideEditor({
  guide,
  onChange,
  onReview,
}: {
  guide: VoterGuideDraft;
  onChange: (guide: VoterGuideDraft) => void;
  onReview: () => void;
}) {
  const messages = guideReadinessMessages(guide);
  const completeCount = guide.template.contests.filter((contest) =>
    isContestComplete(guide, contest.id),
  ).length;
  return (
    <main className="page editor-page" id="main-content">
      <FictionBanner guide={guide} />
      <section className="editor-intro">
        <p className="eyebrow">{guide.template.jurisdiction} · {formatElectionDate(guide.template.electionDate)}</p>
        <label className="title-field">
          <span>Guide title</span>
          <input value={guide.title} maxLength={180} onChange={(event) => onChange({ ...guide, title: event.target.value })} />
        </label>
        <label className="author-field">
          <span>Author label <small>(optional)</small></span>
          <input
            value={guide.authorLabel ?? ''}
            maxLength={100}
            placeholder="e.g. Cole’s neighborhood guide"
            onChange={(event) => onChange({ ...guide, authorLabel: event.target.value || undefined })}
          />
        </label>
        <div className="progress-block">
          <div className="progress-label">
            <span>{completeCount} of {guide.template.contests.length} contests complete</span>
            <strong>{Math.round((completeCount / guide.template.contests.length) * 100)}%</strong>
          </div>
          <progress max={guide.template.contests.length} value={completeCount}>
            {completeCount} of {guide.template.contests.length}
          </progress>
        </div>
      </section>

      <ValueEditor guide={guide} onChange={onChange} />

      <div className="contest-stack">
        {guide.template.contests.map((contest, index) => (
          <ContestEditor
            key={contest.id}
            contest={contest}
            number={index + 1}
            guide={guide}
            onGuideChange={onChange}
          />
        ))}
      </div>

      <section className="review-gate" aria-labelledby="review-gate-heading">
        <div>
          <h2 id="review-gate-heading">Ready to review?</h2>
          {messages.length > 0 ? (
            <>
              <p>Finish these items before creating a review link:</p>
              <ul>
                {messages.slice(0, 8).map((message) => <li key={message}>{message}</li>)}
              </ul>
            </>
          ) : (
            <p>Every contest has a recommendation, rationale, and linked desired outcome.</p>
          )}
        </div>
        <button className="button button-primary" type="button" disabled={messages.length > 0} onClick={onReview}>
          Review guide
        </button>
      </section>
    </main>
  );
}

function RecommendationSummary({ contest, guide }: { contest: Contest; guide: VoterGuideDraft }) {
  const recommendation = guide.recommendations.find((item) => item.contestId === contest.id);
  if (!recommendation) return null;
  const values = guide.values.filter((value) => recommendation.valueIds.includes(value.id));
  let recommendationText: ReactNode = null;
  if (contest.kind === 'candidate' && recommendation.kind === 'candidate') {
    const candidates = contest.candidates.filter((candidate) =>
      recommendation.candidateIds.includes(candidate.id),
    );
    recommendationText = candidates.map((candidate) => candidate.name).join(' and ');
  } else if (contest.kind === 'measure' && recommendation.kind === 'measure') {
    recommendationText = recommendation.position
      ? recommendation.position[0].toUpperCase() + recommendation.position.slice(1)
      : 'No recommendation';
  }
  return (
    <article className="review-card" data-testid={`review-${contest.id}`}>
      <p className="contest-number">{contest.kind === 'candidate' ? 'Candidate contest' : 'Ballot measure'}</p>
      <h2>{contest.title}</h2>
      <div className="recommendation-callout">
        <span>Recommendation</span>
        <strong>{recommendationText}</strong>
      </div>
      <section>
        <h3>Why</h3>
        <p className="rationale-copy">{recommendation.rationale}</p>
      </section>
      <section>
        <h3>Desired outcomes</h3>
        <ul className="outcome-chips">
          {values.map((value) => <li key={value.id}>{value.text}</li>)}
        </ul>
      </section>
      {recommendation.sources.length > 0 ? (
        <section>
          <h3>Sources</h3>
          <ul className="source-list">
            {recommendation.sources.map((source) => (
              <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>
            ))}
          </ul>
        </section>
      ) : null}
      {contest.kind === 'candidate' && recommendation.kind === 'candidate' &&
      Object.keys(recommendation.ratings).length > 0 ? (
        <details className="ratings-summary">
          <summary>Optional personal-fit ratings</summary>
          <ul>
            {contest.candidates
              .filter((candidate) => recommendation.ratings[candidate.id] !== undefined)
              .map((candidate) => (
                <li key={candidate.id}>
                  <span>{candidate.name}</span>
                  <strong>{recommendation.ratings[candidate.id]} / 5</strong>
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

function GuideReview({
  guide,
  source,
  shareUrl,
  onEdit,
  onCopyLink,
  onMakeCopy,
  onExport,
}: {
  guide: VoterGuideDraft;
  source: 'local' | 'shared';
  shareUrl: string;
  onEdit: () => void;
  onCopyLink: () => void;
  onMakeCopy: () => void;
  onExport: () => void;
}) {
  return (
    <main className="page review-page" id="main-content">
      <FictionBanner guide={guide} />
      {source === 'shared' ? (
        <aside className="shared-banner no-print">
          <div><strong>Read-only shared guide</strong><span>Make a private browser copy to adapt these choices.</span></div>
          <button className="button button-primary" type="button" onClick={onMakeCopy}>Make my copy</button>
        </aside>
      ) : null}
      <header className="review-heading">
        <p className="eyebrow">{guide.template.jurisdiction} · {formatElectionDate(guide.template.electionDate)}</p>
        <h1>{guide.title}</h1>
        {guide.authorLabel ? <p className="byline">Prepared by {guide.authorLabel}</p> : null}
        <p className="review-purpose">
          Recommendations are shown first. The explanation and desired outcomes show how the author reached each one.
        </p>
        <div className="button-row no-print">
          {source === 'local' ? <button className="button button-secondary" type="button" onClick={onEdit}>Edit</button> : null}
          <button className="button button-primary" type="button" onClick={onCopyLink}>Copy private review link</button>
          <button className="button button-secondary" type="button" onClick={onExport}>Export JSON</button>
          <button className="button button-secondary" type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
        {shareUrl ? (
          <label className="share-output no-print">
            <span>Review link</span>
            <textarea readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>
        ) : null}
      </header>
      <div className="review-stack">
        {guide.template.contests.map((contest) => (
          <RecommendationSummary key={contest.id} contest={contest} guide={guide} />
        ))}
      </div>
      <footer className="print-footer">
        Generated with Trusted Voter Guide. Verify election details with your local election authority before voting.
      </footer>
    </main>
  );
}

export default function App() {
  const { draft, legacyDismissed, startGuide, replaceDraft, updateDraft, dismissLegacy } = useGuideStore();
  const initialShared = useMemo(() => readGuideReviewUrl(window.location.href), []);
  const [route, setRoute] = useState<Route>(() =>
    initialShared.kind === 'valid'
      ? { screen: 'review', source: 'shared', guide: initialShared.guide }
      : { screen: 'home' },
  );
  const [notice, setNotice] = useState<Notice>(() =>
    initialShared.kind === 'invalid' ? { kind: 'error', text: initialShared.error } : null,
  );
  const [shareUrl, setShareUrl] = useState('');
  const legacyData = readLegacyData();

  useEffect(() => {
    const handleHashChange = () => {
      const shared = readGuideReviewUrl(window.location.href);
      if (shared.kind === 'valid') {
        setShareUrl('');
        setNotice(null);
        setRoute({ screen: 'review', source: 'shared', guide: shared.guide });
      } else if (shared.kind === 'invalid') {
        setNotice({ kind: 'error', text: shared.error });
        setRoute({ screen: 'home' });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const canReplace = () =>
    !draft || window.confirm('Replace your current guide? A single rolling backup will be kept in this browser.');

  const goHome = () => {
    if (window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setShareUrl('');
    setRoute({ screen: 'home' });
  };

  const startDemo = () => {
    if (!canReplace()) return;
    startGuide(DEMO_TEMPLATE);
    setNotice({ kind: 'success', text: 'Fictional five-contest guide created.' });
    setRoute({ screen: 'edit' });
  };

  const importFile = async (file: File, kind: 'template' | 'guide') => {
    try {
      const input = JSON.parse(await file.text()) as unknown;
      if (!canReplace()) return;
      if (kind === 'template') {
        startGuide(ElectionTemplateSchema.parse(input));
        setNotice({ kind: 'success', text: 'Election template imported.' });
      } else {
        replaceDraft(VoterGuideDraftSchema.parse(input));
        setNotice({ kind: 'success', text: 'Voter guide imported.' });
      }
      setRoute({ screen: 'edit' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown file error';
      setNotice({ kind: 'error', text: `Could not import that ${kind}: ${detail}` });
    }
  };

  const activeReviewGuide =
    route.screen === 'review' ? (route.source === 'shared' ? route.guide : draft) : null;

  const copyLink = async (guide: VoterGuideDraft) => {
    try {
      const url = buildGuideReviewUrl(guide, window.location.href);
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setNotice({ kind: 'success', text: 'Private review link copied.' });
      } catch {
        setNotice({ kind: 'success', text: 'Select and copy the review link shown below.' });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not create a review link.',
      });
    }
  };

  const makeCopy = (guide: VoterGuideDraft) => {
    if (!canReplace()) return;
    replaceDraft({ ...guide, id: newId('guide'), title: `${guide.title} — my copy` });
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setShareUrl('');
    setNotice({ kind: 'success', text: 'Private editable copy saved in this browser.' });
    setRoute({ screen: 'edit' });
  };

  const exportGuide = (guide: VoterGuideDraft) => {
    downloadTextFile(`${safeFilename(guide.title)}.json`, `${JSON.stringify(guide, null, 2)}\n`);
    setNotice({ kind: 'success', text: 'Guide JSON downloaded.' });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppHeader route={route} onHome={goHome} />
      <div className="notice-wrap no-print"><NoticeBox notice={notice} /></div>
      {route.screen === 'home' ? (
        <Home
          draft={draft}
          legacyData={legacyData}
          legacyDismissed={legacyDismissed}
          onStartDemo={startDemo}
          onResume={() => setRoute({ screen: 'edit' })}
          onImportTemplate={(file) => void importFile(file, 'template')}
          onImportGuide={(file) => void importFile(file, 'guide')}
          onDownloadLegacy={() => {
            if (legacyData) downloadTextFile('voting-topics-legacy-vt-m2-backup.json', legacyData);
          }}
          onDismissLegacy={dismissLegacy}
        />
      ) : null}
      {route.screen === 'edit' && draft ? (
        <GuideEditor guide={draft} onChange={(guide) => updateDraft(() => guide)} onReview={() => setRoute({ screen: 'review', source: 'local' })} />
      ) : null}
      {route.screen === 'edit' && !draft ? (
        <main className="page"><p role="alert">No saved guide was found.</p><button className="button button-primary" type="button" onClick={goHome}>Return home</button></main>
      ) : null}
      {route.screen === 'review' && activeReviewGuide ? (
        <GuideReview
          guide={activeReviewGuide}
          source={route.source}
          shareUrl={shareUrl}
          onEdit={() => setRoute({ screen: 'edit' })}
          onCopyLink={() => void copyLink(activeReviewGuide)}
          onMakeCopy={() => makeCopy(activeReviewGuide)}
          onExport={() => exportGuide(activeReviewGuide)}
        />
      ) : null}
    </div>
  );
}
