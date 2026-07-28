import { useEffect, useMemo, useState } from 'react';
import { previewLegacyRaw, previewPrototypeConversion, type MigrationPreview, type PrototypeMigrationPreview } from './domain/migration';
import type { PortableArtifact } from './domain/import';
import { readPeerGuideUrl } from './domain/share';
import { EXPERIMENTAL_GUIDE_KEY, LEGACY_STORAGE_KEY, PROTOTYPE_PROFILE_STORAGE_KEY, PROTOTYPE_WORKSPACE_STORAGE_KEY, readRawLocal, useAppStore } from './domain/store';
import { TopicProfileSchema, newId, type PeerGuide } from './domain/schema';
import { ElectionSetup } from './features/ElectionSetup';
import { LibraryHome } from './features/LibraryHome';
import { MappingEditor } from './features/MappingEditor';
import { ProfileEditor } from './features/ProfileEditor';
import { ReviewPage } from './features/ReviewPage';
import { SharePage } from './features/SharePage';
import { SharedGuide } from './features/SharedGuide';

type View = 'home' | 'priorities' | 'election' | 'research' | 'review' | 'share';

function downloadRaw(filename: string, raw: string) {
  const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); anchor.download = filename; anchor.click(); URL.revokeObjectURL(anchor.href);
}

function App() {
  const store = useAppStore();
  const [view, setView] = useState<View>('home');
  const [shared, setShared] = useState<PeerGuide | null>(null);
  const [linkError, setLinkError] = useState('');
  const [migration, setMigration] = useState<MigrationPreview | null>(null);
  const [migrationError, setMigrationError] = useState('');
  const [prototypeMigration, setPrototypeMigration] = useState<PrototypeMigrationPreview | null>(null);
  const profile = useMemo(() => store.profiles.find((item) => item.id === store.activeProfileId), [store.activeProfileId, store.profiles]);
  const election = useMemo(() => store.elections.find((item) => item.id === store.activeElectionId), [store.activeElectionId, store.elections]);
  const workspace = useMemo(() => store.workspaces.find((item) => item.id === store.activeWorkspaceId), [store.activeWorkspaceId, store.workspaces]);
  const workspaceProfile = workspace ? store.profiles.find((item) => item.id === workspace.profileId) : undefined;
  const workspaceElection = workspace ? store.elections.find((item) => item.id === workspace.electionId) : undefined;
  const legacyRaw = readRawLocal(LEGACY_STORAGE_KEY);
  const experimentalRaw = readRawLocal(EXPERIMENTAL_GUIDE_KEY);
  const prototypeProfileRaw = readRawLocal(PROTOTYPE_PROFILE_STORAGE_KEY);
  const prototypeWorkspaceRaw = readRawLocal(PROTOTYPE_WORKSPACE_STORAGE_KEY);

  useEffect(() => {
    void useAppStore.getState().migrateStoredArtifacts();
  }, []);

  useEffect(() => {
    const inspectHash = () => { void readPeerGuideUrl(window.location.href).then((result) => {
      if (result.kind === 'valid') { setShared(result.guide); setLinkError(''); }
      if (result.kind === 'invalid') setLinkError(result.error);
    }); };
    inspectHash(); window.addEventListener('hashchange', inspectHash); return () => window.removeEventListener('hashchange', inspectHash);
  }, []);

  const navigate = (next: View) => { setView(next); setShared(null); window.scrollTo({ top: 0 }); };
  const openWorkspace = (id: string) => { store.setActiveWorkspace(id); navigate('research'); };
  const openPair = () => {
    if (!profile || !election) { navigate('home'); return; }
    openWorkspace(store.resumeOrCreateWorkspace(profile.id, election.id));
  };
  const importArtifact = (artifact: PortableArtifact, importedFrom?: string) => {
    if (artifact.kind === 'profile') { store.importProfile(artifact.value); navigate('priorities'); return; }
    if (artifact.kind === 'election') { store.importElection(artifact.value, importedFrom); navigate('election'); return; }
    if (artifact.kind === 'guide') { store.importGuide(artifact.value); setShared(artifact.value); return; }
    const now = new Date().toISOString();
    const profileFromMenu = TopicProfileSchema.parse({ version: 'vt.topic-profile.v3', id: newId('profile'), title: artifact.value.title, topics: artifact.value.items.map((item) => ({ id: newId('topic'), title: item.statement, category: item.category, stars: null, sources: [], origin: { menuId: artifact.value.id, menuItemId: item.id, menuRevision: item.revision, menuDigest: artifact.value.digest, customized: false } })), authorship: { kind: 'import' }, createdAt: now, updatedAt: now });
    store.importProfile(profileFromMenu); navigate('priorities');
  };

  const navContext = workspaceElection?.title ?? election?.title ?? profile?.title ?? 'Your local artifact library';
  const canPair = Boolean(profile && election && election.contests.every((contest) => contest.verification.status === 'verified') && profile.topics.length && profile.topics.every((topic) => topic.stars !== null));
  const canResearch = Boolean(workspace && workspaceProfile && workspaceElection);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="app-header"><button className="brand-button" onClick={() => navigate('home')} type="button">Voting Topics</button>{!shared && <nav className="main-nav" aria-label="Builder steps" tabIndex={0}><button aria-current={view === 'priorities' ? 'page' : undefined} disabled={!profile} onClick={() => navigate('priorities')} type="button">1 Priorities</button><button aria-current={view === 'election' ? 'page' : undefined} disabled={!election} onClick={() => navigate('election')} type="button">2 Election</button><button aria-current={view === 'research' ? 'page' : undefined} disabled={!canPair && !canResearch} onClick={canResearch ? () => navigate('research') : openPair} type="button">3 Pair & research</button><button aria-current={view === 'review' ? 'page' : undefined} disabled={!canResearch} onClick={() => navigate('review')} type="button">4 Draft & review</button><button aria-current={view === 'share' ? 'page' : undefined} disabled={!canResearch} onClick={() => navigate('share')} type="button">5 Share</button></nav>}<span className="header-context">{shared ? 'Peer inspection' : navContext}</span></header>
    {linkError && <div className="notice-wrap"><p className="notice notice-error" role="alert">{linkError}</p></div>}
    {shared ? <SharedGuide guide={shared} onFork={(author) => { store.forkGuide(shared, author); window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`); setShared(null); setView('priorities'); }} onImportElection={() => { const now = new Date().toISOString(); store.importElection({ ...shared.election, id: newId('election'), title: `${shared.election.title} copy`, authorship: { kind: 'fork' }, lineage: { parentElectionId: shared.election.id, parentDigest: shared.snapshotDigest }, createdAt: now, updatedAt: now }); window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`); setShared(null); setView('election'); }} /> : view === 'home' ? <LibraryHome
      archived={{ profiles: store.preferences.archivedProfileIds, elections: store.preferences.archivedElectionIds, workspaces: store.preferences.archivedWorkspaceIds, guides: store.preferences.archivedGuideIds }}
      elections={store.elections}
      guides={store.guides}
      legacyPanel={<LegacyRecovery experimentalRaw={experimentalRaw} legacyRaw={legacyRaw} migration={migration} migrationError={migrationError} prototypeMigration={prototypeMigration} prototypeProfileRaw={prototypeProfileRaw} prototypeWorkspaceRaw={prototypeWorkspaceRaw} onAccept={() => { if (migration) { store.importProfile(migration.profile); setMigration(null); navigate('priorities'); } }} onCancel={() => setMigration(null)} onPreview={() => { try { if (!legacyRaw) return; setMigration(previewLegacyRaw(legacyRaw)); setMigrationError(''); } catch (cause) { setMigrationError(cause instanceof Error ? cause.message : 'Could not preview conversion.'); } }} onPrototypeAccept={() => { if (!prototypeMigration) return; store.importPrototypeLibrary(prototypeMigration); setPrototypeMigration(null); navigate(prototypeMigration.workspaces.length ? 'research' : 'priorities'); }} onPrototypeCancel={() => setPrototypeMigration(null)} onPrototypePreview={() => { try { setPrototypeMigration(previewPrototypeConversion(prototypeProfileRaw, prototypeWorkspaceRaw)); setMigrationError(''); } catch (cause) { setMigrationError(cause instanceof Error ? cause.message : 'Could not preview prototype conversion.'); } }} />}
      onArchive={store.archiveArtifact}
      onCreateElection={store.createElection}
      onCreateProfile={store.createProfile}
      onDemo={() => { store.installDemo(); navigate('priorities'); }}
      onDuplicateElection={(id) => { const next = store.duplicateElection(id); if (next) { store.setActiveElection(next); navigate('election'); } }}
      onDuplicateProfile={(id) => { const next = store.duplicateProfile(id); if (next) { store.setActiveProfile(next); navigate('priorities'); } }}
      onEditElection={(id) => { store.setActiveElection(id); navigate('election'); }}
      onEditProfile={(id) => { store.setActiveProfile(id); navigate('priorities'); }}
      onImport={importArtifact}
      onInspectGuide={(guide) => setShared(guide)}
      onPair={(profileId, electionId) => openWorkspace(store.resumeOrCreateWorkspace(profileId, electionId))}
      onResume={openWorkspace}
      profiles={store.profiles}
      workspaces={store.workspaces}
    /> : view === 'priorities' && profile ? <ProfileEditor profile={profile} onAdd={store.addTopic} onAddMenu={store.addMenuTopics} onApplyProposal={store.applyPriorityProposal} onRemove={store.removeTopic} onUpdate={store.updateTopic} onUpdateProfile={store.updateProfile} nextStepLabel={election ? 'Continue to election' : 'Create election and continue'} onContinue={() => { if (!election) store.createElection(); navigate('election'); }} /> : view === 'election' && election ? <ElectionSetup election={election} onApplyProposal={(proposal, toolLabel) => { store.applyElectionProposal(proposal, toolLabel); }} onContinue={openPair} onReplaceContests={store.replaceContests} onSource={store.upsertElectionSource} onUpdateElection={store.updateElection} onVerify={store.verifyContest} /> : canResearch && workspace && workspaceProfile && workspaceElection ? view === 'research' ? <MappingEditor election={workspaceElection} onApplyAssessment={store.applyAssessmentBatch} onApplyRelevance={store.applyRelevanceProposal} onAssessment={store.setAssessment} onContinue={() => navigate('review')} onRelevantTopics={store.setRelevantTopics} onSource={store.upsertSource} profile={workspaceProfile} workspace={workspace} /> : view === 'review' ? <ReviewPage election={workspaceElection} onApplyReview={store.applyReviewProposal} onContinue={() => navigate('share')} onDecision={store.setDecision} parentGuide={store.parentGuide} profile={workspaceProfile} workspace={workspace} /> : <SharePage election={workspaceElection} onSnapshot={store.importGuide} parentGuide={store.parentGuide} profile={workspaceProfile} workspace={workspace} /> : <main className="page" id="main"><section className="card empty-state"><h1>Choose artifacts from your library</h1><p>Create or select a priority profile and election, then pair them for research.</p><button className="button button-primary" onClick={() => navigate('home')} type="button">Open library</button></section></main>}
  </>;
}

function LegacyRecovery({ legacyRaw, experimentalRaw, prototypeProfileRaw, prototypeWorkspaceRaw, migration, prototypeMigration, migrationError, onPreview, onAccept, onCancel, onPrototypePreview, onPrototypeAccept, onPrototypeCancel }: { legacyRaw: string | null; experimentalRaw: string | null; prototypeProfileRaw: string | null; prototypeWorkspaceRaw: string | null; migration: MigrationPreview | null; prototypeMigration: PrototypeMigrationPreview | null; migrationError: string; onPreview: () => void; onAccept: () => void; onCancel: () => void; onPrototypePreview: () => void; onPrototypeAccept: () => void; onPrototypeCancel: () => void }) {
  if (!legacyRaw && !experimentalRaw && !prototypeProfileRaw && !prototypeWorkspaceRaw) return null;
  return <section className="legacy-recovery"><div className="section-heading"><div><p className="eyebrow">Non-destructive recovery</p><h2>Earlier Voting Topics data</h2></div></div>{legacyRaw && <article className="card legacy-panel"><h3>Legacy priority data found</h3><p>The exact <code>vt.m2</code> bytes remain untouched. Conversion creates a new profile only after you accept this preview.</p><div className="button-row"><button className="button button-primary" onClick={onPreview} type="button">Preview conversion</button><button className="button button-secondary" onClick={() => downloadRaw('vt-m2-exact-backup.json', legacyRaw)} type="button">Download exact raw data</button></div>{migrationError && <p className="notice notice-error" role="alert">{migrationError}</p>}{migration && <div className="migration-preview"><h3>{migration.detectedVersion} → {migration.profile.version}</h3><ul>{migration.profile.topics.map((topic) => <li key={topic.id}>{topic.title} · {topic.stars} stars{topic.category ? ` · ${topic.category}` : ''}</li>)}</ul><h3>Warnings and discarded category weight</h3><ul>{migration.warnings.map((warning) => <li key={warning}>{warning}</li>)}{migration.discardedCategoryImportance.map((item) => <li key={item.category}>{item.category}: old importance {item.importance} (not compounded)</li>)}</ul><div className="button-row"><button className="button button-primary" onClick={onAccept} type="button">Accept as new profile</button><button className="button button-secondary" onClick={onCancel} type="button">Cancel without changes</button></div></div>}</article>}{(prototypeProfileRaw || prototypeWorkspaceRaw) && <article className="card backup-panel"><h3>Reusable-peer prototype backup</h3><p>The prior profile and workspace storage remain untouched while the new library uses separate versioned keys.</p><div className="button-row"><button className="button button-primary" onClick={onPrototypePreview} type="button">Preview library conversion</button>{prototypeProfileRaw && <button className="button button-secondary" onClick={() => downloadRaw('prototype-profiles-exact-backup.json', prototypeProfileRaw)} type="button">Download prototype profiles</button>}{prototypeWorkspaceRaw && <button className="button button-secondary" onClick={() => downloadRaw('prototype-workspaces-exact-backup.json', prototypeWorkspaceRaw)} type="button">Download prototype workspaces</button>}</div>{prototypeMigration && <div className="migration-preview"><h3>Prototype → normalized library</h3><p>{prototypeMigration.profiles.length} profile(s), {prototypeMigration.elections.length} election(s), and {prototypeMigration.workspaces.length} paired workspace(s) are ready to copy.</p><ul>{prototypeMigration.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><div className="button-row"><button className="button button-primary" onClick={onPrototypeAccept} type="button">Accept copied library</button><button className="button button-secondary" onClick={onPrototypeCancel} type="button">Cancel without changes</button></div></div>}</article>}{experimentalRaw && <article className="card backup-panel"><h3>Hand-authored guide backup</h3><button className="button button-secondary" onClick={() => downloadRaw('vt-guide-v1-backup.json', experimentalRaw)} type="button">Download experimental guide</button></article>}</section>;
}

export default App;
