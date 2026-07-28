import { useMemo, useState } from 'react';
import { HandoffPanel } from '../components/HandoffPanel';
import { StarsInput } from '../components/StarsInput';
import { priorityContext, type Proposal } from '../domain/handoff';
import { PRIORITY_CATEGORIES, PRIORITY_MENU } from '../domain/priority-menu';
import type { PriorityProposal, Topic, TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  onAdd: () => void;
  onAddMenu: (ids: string[]) => void;
  onApplyProposal: (proposal: PriorityProposal, selected: Set<string>, toolLabel?: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Topic, 'title' | 'category' | 'stars'>>) => number;
  onUpdateProfile: (patch: Partial<Pick<TopicProfile, 'title' | 'ownerLabel'>>) => void;
  onContinue: () => void;
  nextStepLabel: string;
}

function downloadProfile(profile: TopicProfile) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([`${JSON.stringify(profile, null, 2)}\n`], { type: 'application/json' }));
  anchor.download = 'voting-topics-profile.json'; anchor.click(); URL.revokeObjectURL(anchor.href);
}

export function ProfileEditor({ profile, onAdd, onAddMenu, onApplyProposal, onRemove, onUpdate, onUpdateProfile, onContinue, nextStepLabel }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(PRIORITY_CATEGORIES[0]);
  const [reviewOrder, setReviewOrder] = useState<string[] | null>(null);
  const [handoffScope, setHandoffScope] = useState<'all' | 'visible'>('all');
  const existingOrigins = useMemo(() => new Map(profile.topics.flatMap((topic) => topic.origin?.menuItemId ? [[topic.origin.menuItemId, topic] as const] : [])), [profile.topics]);
  const filtered = PRIORITY_MENU.items.filter((item) => (category === 'All categories' || item.category === category) && `${item.statement} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const categoryIndex = PRIORITY_CATEGORIES.indexOf(category);
  const unratedCount = profile.topics.filter((topic) => topic.stars === null).length;
  const ratedCount = profile.topics.length - unratedCount;
  const grouped = useMemo(() => {
    if (!reviewOrder) return profile.topics;
    const topics = new Map(profile.topics.map((topic) => [topic.id, topic]));
    const ordered = reviewOrder.flatMap((id) => {
      const topic = topics.get(id);
      if (!topic) return [];
      topics.delete(id);
      return [topic];
    });
    return [...ordered, ...topics.values()];
  }, [profile.topics, reviewOrder]);

  const moveCategory = (offset: number) => {
    const next = PRIORITY_CATEGORIES[categoryIndex + offset];
    if (next) setCategory(next);
  };

  return <main className="page" id="main">
    <div className="page-heading">
      <p className="eyebrow">Priorities · reusable across elections</p>
      <h1>What outcomes matter to you?</h1>
      <p>Choose concrete outcomes from the menu or write your own, then use 0–5 stars for <strong>how much they should influence your ballot</strong>. Categories only help you browse.</p>
    </div>

    <section className={`card profile-rating-progress ${unratedCount ? 'needs-rating' : 'is-ready'}`} aria-live="polite">
      <div><strong>{ratedCount}/{profile.topics.length}</strong><span>selected priorities rated</span></div>
      <p>{unratedCount ? `${unratedCount} ${unratedCount === 1 ? 'priority is' : 'priorities are'} still Unrated. Choose 0–5 for each before continuing.` : profile.topics.length ? 'Every selected priority has an explicit rating, including any zero ratings.' : 'Choose priorities to build your profile.'}</p>
      <a className="button button-secondary button-small" href="#profile-review">Review ratings</a>
    </section>

    <section className="card profile-identity form-grid">
      <label>Profile title<input defaultValue={profile.title} onBlur={(event) => onUpdateProfile({ title: event.currentTarget.value.trim() || profile.title })} /></label>
      <label>Your share label<input value={profile.ownerLabel ?? ''} onChange={(event) => onUpdateProfile({ ownerLabel: event.currentTarget.value || undefined })} placeholder="Optional" /></label>
      <button className="button button-secondary" onClick={() => downloadProfile(profile)} type="button">Export profile JSON</button>
    </section>

    <section className="priority-menu-layout">
      <div className="card menu-browser">
        <div className="section-heading"><div><p className="eyebrow">Choose · saved immediately</p><h2>Priority menu</h2></div><span className="count-badge">{PRIORITY_MENU.items.length} outcomes</span></div>
        <div className="menu-filters"><label>Search within this view<input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Housing, privacy, safety…" /></label><label>Category card<select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>{PRIORITY_CATEGORIES.map((item) => <option key={item}>{item}</option>)}<option>All categories</option></select></label></div>
        <div className="category-card-nav" aria-label="Browse category cards">
          <button className="button button-secondary button-small" disabled={categoryIndex <= 0} onClick={() => moveCategory(-1)} type="button">← Previous</button>
          <div><strong>{category === 'All categories' ? 'All categories' : category}</strong><small>{category === 'All categories' ? `${PRIORITY_CATEGORIES.length} category cards together` : `Category ${categoryIndex + 1} of ${PRIORITY_CATEGORIES.length}`}</small></div>
          <button className="button button-secondary button-small" disabled={categoryIndex < 0 || categoryIndex >= PRIORITY_CATEGORIES.length - 1} onClick={() => moveCategory(1)} type="button">Next →</button>
        </div>
        <div className="menu-results" aria-label="Priority menu results">
          {filtered.map((item) => {
            const addedTopic = existingOrigins.get(item.id);
            return <div className={`menu-item ${addedTopic ? 'is-added' : ''}`} key={item.id}><label className="menu-item-choice"><input checked={Boolean(addedTopic)} onChange={(event) => { if (event.currentTarget.checked) onAddMenu([item.id]); else if (addedTopic && window.confirm('Remove this priority? Any contest relevance and assessments connected to it will also be removed.')) onRemove(addedTopic.id); }} type="checkbox" /><span><strong>{item.statement}</strong><small>{item.category}{addedTopic ? ' · selected and saved' : ''}</small></span></label>{addedTopic && <StarsInput label={`Influence rating for ${item.statement}`} value={addedTopic.stars} onChange={(stars) => onUpdate(addedTopic.id, { stars })} />}</div>;
          })}
          {!filtered.length && <p className="empty-state">No menu outcomes match that search. You can add a custom priority instead.</p>}
        </div>
        <div className="sticky-actions"><p role="status">Checkmarks are already in your profile and included in exports.</p><button className="button button-secondary" onClick={onAdd} type="button">Write a custom priority</button></div>
      </div>

      <aside className="card priority-summary">
        <p className="eyebrow">Prioritize</p><h2>Your profile</h2>
        <p>{profile.topics.length ? `${profile.topics.length} selected outcomes; ${unratedCount} Unrated.` : 'Choose a few outcomes to begin. Your profile can grow across elections.'}</p>
        <div className="star-summary">{([null, 5, 4, 3, 2, 1, 0] as const).map((stars) => <span key={stars ?? 'unrated'}><strong>{profile.topics.filter((topic) => topic.stars === stars).length}</strong><small>{stars === null ? 'Unrated' : `${stars} star${stars === 1 ? '' : 's'}`}</small></span>)}</div>
      </aside>
    </section>

    <section className="profile-review" id="profile-review">
      <div className="section-heading"><div><p className="eyebrow">Review</p><h2>Your selected priorities</h2><p className="review-order-note">Ratings do not move a priority while you are editing it.</p></div><div className="review-order-actions"><button className="button button-secondary" onClick={() => setReviewOrder([...profile.topics].sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.title.localeCompare(b.title)).map((topic) => topic.id))} type="button">Sort by rating now</button>{reviewOrder && <button className="button button-quiet" onClick={() => setReviewOrder(null)} type="button">Restore profile order</button>}<button className="button button-secondary" onClick={onAdd} type="button">Add custom</button></div></div>
      {reviewOrder && <p className="sort-status" role="status">Sorted by the current ratings. This order is now fixed; choose “Sort by rating now” again to refresh it.</p>}
      {!grouped.length && <p className="empty-state">Your profile is empty. Use the menu above or add a custom priority.</p>}
      <div className="topic-list compact-topic-list">{grouped.map((topic) => <article className={`card topic-card compact-topic-card ${topic.stars === null ? 'is-unrated' : ''}`} key={topic.id}>
        <div className="compact-topic-heading"><div><div className="topic-origin"><span>{topic.category ?? 'Custom'}</span>{topic.origin && <small>{topic.origin.customized ? 'Customized menu priority' : 'From the priority menu'}</small>}</div><h3>{topic.title}</h3></div><span className={topic.stars === null ? 'status status-research-needed' : 'status status-ready'}>{topic.stars === null ? 'Unrated' : `${topic.stars}/5`}</span></div>
        <StarsInput label="How much this should influence my ballot" value={topic.stars} onChange={(stars) => onUpdate(topic.id, { stars })} />
        {topic.stars === 0 && <p className="help">Zero-star priorities stay in your profile but do not influence calculations.</p>}
        <details><summary>Edit wording, category, or remove</summary><div className="topic-details"><label>Specific outcome<textarea defaultValue={topic.title} onBlur={(event) => { const next = event.currentTarget.value.trim(); if (next && next !== topic.title) { const invalidated = onUpdate(topic.id, { title: next }); if (invalidated) window.alert(`${invalidated} evidence assessments were invalidated because the priority meaning changed.`); } }} /></label><label>Category (presentation only)<input defaultValue={topic.category ?? ''} onBlur={(event) => onUpdate(topic.id, { category: event.currentTarget.value.trim() || undefined })} /></label><button className="button button-quiet danger" onClick={() => { if (window.confirm('Remove this priority? Any contest relevance and assessments connected to it will also be removed.')) onRemove(topic.id); }} type="button">Remove priority</button></div></details>
      </article>)}</div>
    </section>

    <details className="optional-tools card"><summary>Optional chatbot discussion</summary><div className="task-scope"><label>Priority menu included in optional chatbot brief<select value={handoffScope} onChange={(event) => setHandoffScope(event.currentTarget.value as 'all' | 'visible')}><option value="all">Entire menu ({PRIORITY_MENU.items.length})</option><option value="visible">Current search and category ({filtered.length})</option></select></label></div><HandoffPanel context={priorityContext(profile, handoffScope === 'visible' ? filtered.map((item) => item.id) : undefined)} description="Share the priority menu and your current profile to discuss tradeoffs or ask the chatbot to propose ratings. Voting Topics will validate and preview its response." onAccept={(proposal: Proposal, selectedKeys, toolLabel) => { if (proposal.version === 'vt.priority-proposal.v1') onApplyProposal(proposal, selectedKeys, toolLabel); }} referenceContext={{ profile }} taskType="priorities" title="Discuss and prioritize outcomes" /></details>

    <section className="card profile-next-step">
      <div><p className="eyebrow">Next step</p><h2>{!profile.topics.length ? 'Choose at least one priority' : unratedCount ? `Rate ${unratedCount} remaining ${unratedCount === 1 ? 'priority' : 'priorities'}` : 'Your priorities are ready'}</h2><p>{!profile.topics.length ? 'Select at least one menu outcome or add a custom priority before continuing.' : unratedCount ? 'Unrated is intentionally different from zero. Choose a rating for every selected priority.' : 'Every 0–5 rating is valid, and you can return to change it later.'}</p></div>
      <button className="button button-primary" disabled={!profile.topics.length || unratedCount > 0} onClick={onContinue} type="button">{nextStepLabel}</button>
    </section>
  </main>;
}
