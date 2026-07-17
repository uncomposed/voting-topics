import { useEffect, useMemo, useState } from 'react';
import { previewLegacyRaw, type MigrationPreview } from './domain/migration';
import { readPeerGuideUrl, verifyPeerGuide } from './domain/share';
import { EXPERIMENTAL_GUIDE_KEY, LEGACY_STORAGE_KEY, readRawLocal, useAppStore } from './domain/store';
import { PeerGuideSchema, type PeerGuide } from './domain/schema';
import { ElectionSetup } from './features/ElectionSetup';
import { MappingEditor } from './features/MappingEditor';
import { ProfileEditor } from './features/ProfileEditor';
import { ReviewPage } from './features/ReviewPage';
import { SharedGuide } from './features/SharedGuide';

type View = 'home' | 'topics' | 'election' | 'mapping' | 'review';

function downloadRaw(filename: string, raw: string) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  anchor.download = filename; anchor.click(); URL.revokeObjectURL(anchor.href);
}

function App() {
  const store = useAppStore();
  const [view, setView] = useState<View>('home');
  const [shared, setShared] = useState<PeerGuide | null>(null);
  const [linkError, setLinkError] = useState('');
  const [migration, setMigration] = useState<MigrationPreview | null>(null);
  const [migrationError, setMigrationError] = useState('');
  const [importError, setImportError] = useState('');
  const profile = useMemo(() => store.profiles.find((candidate) => candidate.id === store.activeProfileId) ?? store.profiles[0], [store.activeProfileId, store.profiles]);
  const workspace = useMemo(() => store.workspaces.find((candidate) => candidate.id === store.activeWorkspaceId) ?? store.workspaces[0], [store.activeWorkspaceId, store.workspaces]);
  const legacyRaw = readRawLocal(LEGACY_STORAGE_KEY);
  const experimentalRaw = readRawLocal(EXPERIMENTAL_GUIDE_KEY);

  useEffect(() => {
    const inspectHash = () => {
      void readPeerGuideUrl(window.location.href).then((result) => {
        if (result.kind === 'valid') { setShared(result.guide); setLinkError(''); }
        if (result.kind === 'invalid') { setLinkError(result.error); setImportError(''); }
      });
    };
    inspectHash();
    window.addEventListener('hashchange', inspectHash);
    return () => window.removeEventListener('hashchange', inspectHash);
  }, []);

  const navigate = (next: View) => { setView(next); setShared(null); window.scrollTo({ top: 0 }); };
  const fork = (author: string) => {
    if (!shared) return;
    store.forkGuide(shared, author);
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    setShared(null); setView('topics');
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-header">
        <button className="brand-button" onClick={() => navigate('home')} type="button">Voting Topics</button>
        {profile && workspace && !shared && <nav className="main-nav" aria-label="Builder steps">
          {([['topics', '1 Topics'], ['election', '2 Election'], ['mapping', '3 Map'], ['review', '4 Draft & share']] as const).map(([id, label]) => <button aria-current={view === id ? 'page' : undefined} key={id} onClick={() => navigate(id)} type="button">{label}</button>)}
        </nav>}
        <span className="header-context">{shared ? 'Peer inspection' : workspace?.election.title ?? 'Reusable peer sample ballot'}</span>
      </header>
      {linkError && <div className="notice-wrap"><p className="notice notice-error" role="alert">{linkError}</p></div>}
      {shared ? <SharedGuide guide={shared} onFork={fork} /> : view === 'home' ? <Home
        experimentalRaw={experimentalRaw}
        legacyRaw={legacyRaw}
        migration={migration}
        migrationError={migrationError}
        importError={importError}
        onAcceptMigration={() => { if (migration) { store.importProfile(migration.profile); setMigration(null); navigate('topics'); } }}
        onCancelMigration={() => setMigration(null)}
        onDemo={() => { store.installDemo(); navigate('topics'); }}
        onImportGuide={async (file) => {
          try {
            const guide = PeerGuideSchema.parse(JSON.parse(await file.text()));
            if (!(await verifyPeerGuide(guide))) throw new Error('The snapshot digest does not match its contents.');
            setImportError(''); setShared(guide);
          } catch (cause) { setImportError(`Could not import that snapshot. ${cause instanceof Error ? cause.message : ''} Local work was not changed.`); }
        }}
        onPreviewMigration={() => { try { if (!legacyRaw) return; setMigration(previewLegacyRaw(legacyRaw)); setMigrationError(''); } catch (cause) { setMigrationError(cause instanceof Error ? cause.message : 'Could not preview conversion.'); } }}
        onResume={() => navigate('topics')}
        hasWork={Boolean(profile && workspace)}
      /> : !profile || !workspace ? <Home experimentalRaw={experimentalRaw} legacyRaw={legacyRaw} migration={migration} migrationError={migrationError} importError={importError} onAcceptMigration={() => undefined} onCancelMigration={() => setMigration(null)} onDemo={() => { store.installDemo(); navigate('topics'); }} onImportGuide={() => undefined} onPreviewMigration={() => undefined} onResume={() => undefined} hasWork={false} /> : view === 'topics' ? <ProfileEditor profile={profile} onAdd={store.addTopic} onRemove={store.removeTopic} onUpdate={store.updateTopic} /> : view === 'election' ? <ElectionSetup workspace={workspace} onReplaceContests={store.replaceContests} onUpdateElection={store.updateElection} /> : view === 'mapping' ? <MappingEditor profile={profile} workspace={workspace} onAssessment={store.setAssessment} onRelevantTopics={store.setRelevantTopics} onSource={store.upsertSource} /> : <ReviewPage parentGuide={store.parentGuide} profile={profile} workspace={workspace} onDecision={store.setDecision} />}
    </>
  );
}

interface HomeProps {
  hasWork: boolean;
  legacyRaw: string | null;
  experimentalRaw: string | null;
  migration: MigrationPreview | null;
  migrationError: string;
  importError: string;
  onDemo: () => void;
  onImportGuide: (file: File) => void | Promise<void>;
  onResume: () => void;
  onPreviewMigration: () => void;
  onAcceptMigration: () => void;
  onCancelMigration: () => void;
}

function Home({ hasWork, legacyRaw, experimentalRaw, migration, migrationError, importError, onDemo, onImportGuide, onResume, onPreviewMigration, onAcceptMigration, onCancelMigration }: HomeProps) {
  return <main className="page" id="main">
    <section className="hero"><p className="eyebrow">For the politically activated friend—and every peer who asks “why?”</p><h1>Turn what you care about into an explainable sample ballot.</h1><p className="hero-copy">Reuse your topic priorities. Map candidates and options with cited evidence. Generate the ballot this election actually accepts. Then let friends inspect, fork, change, and reshare it without joining a group account.</p><div className="primary-actions">{hasWork && <button className="button button-primary" onClick={onResume} type="button">Resume my ballot</button>}<button className="button button-secondary" onClick={onDemo} type="button">Start with fictional demonstration</button></div></section>
    <section className="loop-grid" aria-label="Product loop">{['Capture reusable topics', 'Map every viable option', 'Generate the real ballot method', 'Review and override', 'Share an immutable snapshot', 'Inspect, change, regenerate, reshare'].map((step, index) => <div className="loop-step" key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}</section>
    <section className="card import-guide-panel"><h2>Inspect a snapshot JSON file</h2><p>Files are parsed and digest-verified before anything is shown. Import never replaces local work.</p><label className="button button-secondary file-button">Choose peer-guide JSON<input accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void onImportGuide(file); event.currentTarget.value = ''; }} type="file" /></label>{importError && <p className="notice notice-error" role="alert">{importError}</p>}</section>
    {legacyRaw && <section className="card legacy-panel"><p className="eyebrow">Legacy data found · never modified</p><h2>Preview a topic-profile conversion</h2><p>Your exact <code>vt.m2</code> bytes remain untouched. Conversion creates a new profile only after you accept the preview. Old category importance is reported, never multiplied into item stars.</p><div className="button-row"><button className="button button-primary" onClick={onPreviewMigration} type="button">Preview conversion</button><button className="button button-secondary" onClick={() => downloadRaw('vt-m2-exact-backup.json', legacyRaw)} type="button">Download exact raw data</button></div>{migrationError && <p className="notice notice-error" role="alert">{migrationError}</p>}{migration && <div className="migration-preview"><h3>{migration.detectedVersion} → {migration.profile.version}</h3><ul>{migration.profile.topics.map((topic) => <li key={topic.id}>{topic.title} · {topic.stars} stars{topic.category ? ` · category: ${topic.category}` : ''}</li>)}</ul><h3>Warnings and discarded category weight</h3><ul>{migration.warnings.map((warning) => <li key={warning}>{warning}</li>)}{migration.discardedCategoryImportance.map((item) => <li key={item.category}>{item.category}: old importance {item.importance} (not compounded)</li>)}</ul><div className="button-row"><button className="button button-primary" onClick={onAcceptMigration} type="button">Accept as new profile</button><button className="button button-secondary" onClick={onCancelMigration} type="button">Cancel without changes</button></div></div>}</section>}
    {experimentalRaw && <section className="card backup-panel"><h2>Experimental hand-authored guide backup</h2><p>The existing <code>vt.guide.v1</code> remains downloadable. It is not silently promoted into evidence-backed topics.</p><button className="button button-secondary" onClick={() => downloadRaw('vt-guide-v1-backup.json', experimentalRaw)} type="button">Download experimental guide</button></section>}
  </main>;
}

export default App;
