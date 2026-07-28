import { useState } from 'react';
import { ArtifactImport } from '../components/ArtifactImport';
import type { PortableArtifact } from '../domain/import';
import type { ElectionTemplate, ElectionWorkspace, PeerGuide, TopicProfile } from '../domain/schema';

interface Props {
  profiles: TopicProfile[];
  elections: ElectionTemplate[];
  workspaces: ElectionWorkspace[];
  guides: PeerGuide[];
  archived: { profiles: string[]; elections: string[]; workspaces: string[]; guides: string[] };
  legacyPanel?: React.ReactNode;
  onArchive: (kind: 'profile' | 'election' | 'workspace' | 'guide', id: string, archived: boolean) => void;
  onCreateProfile: () => string;
  onCreateElection: () => string;
  onDemo: () => void;
  onDuplicateProfile: (id: string) => void;
  onDuplicateElection: (id: string) => void;
  onEditProfile: (id: string) => void;
  onEditElection: (id: string) => void;
  onImport: (artifact: PortableArtifact, importedFrom?: string) => void;
  onPair: (profileId: string, electionId: string) => void;
  onResume: (workspaceId: string) => void;
  onInspectGuide: (guide: PeerGuide) => void;
}

export function LibraryHome({ profiles, elections, workspaces, guides, archived, legacyPanel, onArchive, onCreateProfile, onCreateElection, onDemo, onDuplicateProfile, onDuplicateElection, onEditProfile, onEditElection, onImport, onPair, onResume, onInspectGuide }: Props) {
  const visibleProfiles = profiles.filter((item) => !archived.profiles.includes(item.id));
  const visibleElections = elections.filter((item) => !archived.elections.includes(item.id));
  const visibleWorkspaces = workspaces.filter((item) => !archived.workspaces.includes(item.id));
  const visibleGuides = guides.filter((item) => !archived.guides.includes(item.snapshotDigest));
  const [profileId, setProfileId] = useState(visibleProfiles[0]?.id ?? '');
  const [electionId, setElectionId] = useState(visibleElections[0]?.id ?? '');
  const selectedProfile = visibleProfiles.find((profile) => profile.id === profileId);
  const selectedElection = visibleElections.find((election) => election.id === electionId);
  const matchingWorkspace = visibleWorkspaces.find((workspace) => workspace.profileId === profileId && workspace.electionId === electionId);
  const profileReady = Boolean(selectedProfile?.topics.length && selectedProfile.topics.every((topic) => topic.stars !== null));
  const electionReady = Boolean(selectedElection?.contests.every((contest) => contest.verification.status === 'verified'));
  const canPair = Boolean(profileId && electionId && (matchingWorkspace || (profileReady && electionReady)));

  return <main className="page" id="main">
    <section className="library-hero"><p className="eyebrow">Local-first voter-guide studio</p><h1>Your priorities, elections, and peer guides</h1><p>Build every part directly in Voting Topics. When useful, take a task-specific brief to any chatbot and bring its proposal back for verification.</p><div className="primary-actions"><button className="button button-primary" onClick={() => onEditProfile(onCreateProfile())} type="button">Create a priority profile</button><button className="button button-secondary" onClick={() => onEditElection(onCreateElection())} type="button">Create an election</button><button className="button button-secondary" onClick={onDemo} type="button">Open fictional demonstration</button></div></section>

    {visibleProfiles.length > 0 && visibleElections.length > 0 && <section className="card pair-card"><div><p className="eyebrow">Start or resume the core loop</p><h2>Pair a reusable profile with an election</h2><p>The most recently updated matching workspace resumes automatically. A new pair requires at least one explicitly rated priority and every election contest verified.</p></div><div className="pair-controls"><label>Priority profile<select value={profileId} onChange={(event) => setProfileId(event.currentTarget.value)}>{visibleProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.title}</option>)}</select></label><label>Election<select value={electionId} onChange={(event) => setElectionId(event.currentTarget.value)}>{visibleElections.map((election) => <option key={election.id} value={election.id}>{election.title}</option>)}</select></label>{!matchingWorkspace && (!profileReady || !electionReady) && <p className="help" role="status">{!profileReady ? 'Rate every selected priority 0–5. ' : ''}{!electionReady ? 'Verify every election contest.' : ''}</p>}<button className="button button-primary" disabled={!canPair} onClick={() => onPair(profileId, electionId)} type="button">{matchingWorkspace ? 'Resume matching research' : 'Pair and research'}</button></div></section>}

    <section className="library-section"><div className="section-heading"><div><p className="eyebrow">Work in progress</p><h2>Paired workspaces</h2></div><span className="count-badge">{visibleWorkspaces.length}</span></div>{!visibleWorkspaces.length && <p className="empty-state">Create both a profile and an election, then pair them here.</p>}<div className="artifact-grid">{visibleWorkspaces.map((workspace) => {
      const profile = profiles.find((item) => item.id === workspace.profileId);
      const election = elections.find((item) => item.id === workspace.electionId);
      const complete = workspace.mapping.contests.reduce((sum, contest) => sum + contest.assessments.length, 0);
      const expected = election?.contests.reduce((sum, contest) => sum + contest.options.length * (workspace.mapping.contests.find((item) => item.contestId === contest.id)?.relevantTopicIds.length ?? 0), 0) ?? 0;
      return <article className="card artifact-card" key={workspace.id}><p className="eyebrow">{complete}/{expected} assessments</p><h3>{election?.title ?? workspace.electionId}</h3><p>{profile?.title ?? workspace.profileId}</p><div className="button-row"><button className="button button-primary" onClick={() => onResume(workspace.id)} type="button">Resume research</button><button className="button button-quiet" onClick={() => onArchive('workspace', workspace.id, true)} type="button">Archive</button></div></article>;
    })}</div></section>

    <section className="library-section"><div className="section-heading"><div><p className="eyebrow">Reusable</p><h2>Priority profiles</h2></div><button className="button button-secondary" onClick={() => onEditProfile(onCreateProfile())} type="button">New profile</button></div><div className="artifact-grid">{visibleProfiles.map((profile) => <article className="card artifact-card" key={profile.id}><p className="eyebrow">{profile.topics.length} priorities</p><h3>{profile.title}</h3><p>{profile.ownerLabel ?? 'Private profile'}</p><div className="button-row"><button className="button button-primary" onClick={() => onEditProfile(profile.id)} type="button">Edit priorities</button><button className="button button-secondary" onClick={() => onDuplicateProfile(profile.id)} type="button">Duplicate</button><button className="button button-quiet" onClick={() => onArchive('profile', profile.id, true)} type="button">Archive</button></div></article>)}</div></section>

    <section className="library-section"><div className="section-heading"><div><p className="eyebrow">User-owned</p><h2>Elections</h2></div><button className="button button-secondary" onClick={() => onEditElection(onCreateElection())} type="button">New election</button></div><div className="artifact-grid">{visibleElections.map((election) => <article className="card artifact-card" key={election.id}><p className="eyebrow">{election.contests.length} contests · {election.contests.filter((contest) => contest.verification.status === 'verified').length} verified</p><h3>{election.title}</h3><p>{election.jurisdiction} · {election.electionDate}</p><div className="button-row"><button className="button button-primary" onClick={() => onEditElection(election.id)} type="button">Edit election</button><button className="button button-secondary" onClick={() => onDuplicateElection(election.id)} type="button">Fork copy</button><button className="button button-quiet" onClick={() => onArchive('election', election.id, true)} type="button">Archive</button></div></article>)}</div></section>

    <section className="library-section"><div className="section-heading"><div><p className="eyebrow">Immutable</p><h2>Saved peer guides</h2></div><span className="count-badge">{visibleGuides.length}</span></div>{!visibleGuides.length && <p className="empty-state">Created or explicitly imported peer snapshots appear here.</p>}<div className="artifact-grid">{visibleGuides.map((guide) => <article className="card artifact-card" key={guide.snapshotDigest}><p className="eyebrow">{guide.createdAt.slice(0, 10)} · {guide.authorLabel}</p><h3>{guide.election.title}</h3><p>{guide.profile.topics.length} relevant priorities · immutable</p><div className="button-row"><button className="button button-primary" onClick={() => onInspectGuide(guide)} type="button">Inspect snapshot</button><button className="button button-quiet" onClick={() => onArchive('guide', guide.snapshotDigest, true)} type="button">Archive</button></div></article>)}</div></section>

    <ArtifactImport onAccept={onImport} />
    {legacyPanel}
    <details className="card archived-panel"><summary>Archived local artifacts</summary><p>{archived.profiles.length} profiles · {archived.elections.length} elections · {archived.workspaces.length} workspaces · {archived.guides.length} snapshots</p>{archived.profiles.map((id) => <button className="button button-quiet" key={id} onClick={() => onArchive('profile', id, false)} type="button">Restore {profiles.find((item) => item.id === id)?.title ?? id}</button>)}{archived.elections.map((id) => <button className="button button-quiet" key={id} onClick={() => onArchive('election', id, false)} type="button">Restore {elections.find((item) => item.id === id)?.title ?? id}</button>)}{archived.workspaces.map((id) => <button className="button button-quiet" key={id} onClick={() => onArchive('workspace', id, false)} type="button">Restore workspace {id}</button>)}{archived.guides.map((id) => <button className="button button-quiet" key={id} onClick={() => onArchive('guide', id, false)} type="button">Restore snapshot {guides.find((item) => item.snapshotDigest === id)?.election.title ?? id}</button>)}</details>
  </main>;
}
