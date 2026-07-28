import { useMemo, useState } from 'react';
import { diffGuides, summarizeDiff } from '../domain/diff';
import { auditMapping, MINIMUM_COVERAGE } from '../domain/scoring';
import { artifactJson, buildPeerGuideUrl, createPeerGuide, guideJson } from '../domain/share';
import type { ElectionTemplate, ElectionWorkspace, PeerGuide, TopicProfile } from '../domain/schema';

interface Props { profile: TopicProfile; election: ElectionTemplate; workspace: ElectionWorkspace; parentGuide: PeerGuide | null; onSnapshot: (guide: PeerGuide) => void; }

function download(filename: string, raw: string) {
  const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); anchor.download = filename; anchor.click(); URL.revokeObjectURL(anchor.href);
}

export function SharePage({ profile, election, workspace, parentGuide, onSnapshot }: Props) {
  const [author, setAuthor] = useState(profile.ownerLabel ?? 'A friend');
  const [shareUrl, setShareUrl] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const allConfirmed = workspace.decisions.length === election.contests.length && workspace.decisions.every((decision) => decision.confirmed);
  const allElectionVerified = election.contests.every((contest) => contest.verification.status === 'verified');
  const allRelevanceVerified = workspace.mapping.contests.length === election.contests.length && workspace.mapping.contests.every((contest) => contest.verification.status === 'verified');
  const allClaimsVerified = workspace.mapping.contests.every((contest) => contest.assessments.every((assessment) => assessment.verification.status === 'verified'));
  const mappingProblems = auditMapping(profile, election, workspace.mapping);
  const hardReady = allConfirmed && allElectionVerified && allRelevanceVerified && allClaimsVerified && mappingProblems.length === 0;
  const unknownCount = workspace.mapping.contests.flatMap((contest) => contest.assessments).filter((assessment) => assessment.status === 'unknown').length;
  const lowCoverageCount = workspace.draft.contests.flatMap((contest) => contest.optionScores).filter((score) => score.coverage < MINIMUM_COVERAGE).length;
  const researchNeededCount = workspace.draft.contests.filter((contest) => contest.status === 'research-needed').length;
  const closeCallCount = workspace.draft.contests.filter((contest) => contest.status === 'close-call').length;
  const overrideCount = workspace.decisions.filter((decision) => decision.override !== null).length;
  const warnings = [
    ...(unknownCount ? [`${unknownCount} option-priority ${unknownCount === 1 ? 'cell is' : 'cells are'} explicitly Unknown.`] : []),
    ...(lowCoverageCount ? [`${lowCoverageCount} option ${lowCoverageCount === 1 ? 'has' : 'have'} less than 60% weighted evidence coverage.`] : []),
    ...(researchNeededCount ? [`${researchNeededCount} contest ${researchNeededCount === 1 ? 'is' : 'are'} labeled RESEARCH NEEDED and have no automatic ballot translation.`] : []),
    ...(closeCallCount ? [`${closeCallCount} contest ${closeCallCount === 1 ? 'is a' : 'are'} close call${closeCallCount === 1 ? '' : 's'}.`] : []),
    ...(overrideCount ? [`${overrideCount} contest ${overrideCount === 1 ? 'uses a labeled human override' : 'use labeled human overrides'}.`] : []),
  ];
  const canPublish = hardReady && (!warnings.length || warningsAcknowledged);
  const previewDiff = useMemo(() => parentGuide ? { ...parentGuide, profile, election, mapping: workspace.mapping, draft: workspace.draft, decisions: workspace.decisions } as PeerGuide : null, [parentGuide, profile, election, workspace]);
  const changes = previewDiff && parentGuide ? summarizeDiff(diffGuides(parentGuide, previewDiff)) : [];
  const create = () => createPeerGuide(profile, election, workspace, author.trim() || 'A friend', { parent: parentGuide, changesFromParent: changes });

  return <main className="page" id="main">
    <div className="page-heading"><p className="eyebrow">Share · inspect · fork</p><h1>Publish a reproducible guide</h1><p>Share the complete guide, or export your reusable profile and user-owned election separately. Friends can inspect the calculation and make an independent copy.</p></div>
    {parentGuide && <section className="card diff-panel"><h2>What changed from {parentGuide.authorLabel}’s snapshot</h2>{changes.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p>No semantic changes yet.</p>}</section>}
    <section className="portable-output-grid"><article className="card"><p className="eyebrow">Reusable priorities</p><h2>{profile.title}</h2><p>{profile.topics.length} priorities. Reuse this profile with another election.</p><button className="button button-secondary" onClick={() => download('voting-topics-profile.json', artifactJson(profile))} type="button">Export profile JSON</button></article><article className="card"><p className="eyebrow">User-owned election</p><h2>{election.title}</h2><p>{election.contests.length} contests · {allElectionVerified ? 'official rules verified' : 'verification incomplete'}. Publish this file on GitHub if you want others to build from it.</p><button className="button button-secondary" onClick={() => download('voting-topics-election.json', artifactJson(election))} type="button">Export election JSON</button></article></section>
    <section className="card publish-panel"><h2>Immutable peer guide</h2><ul className="readiness-list"><li className={allElectionVerified ? 'ready' : ''}>{allElectionVerified ? '✓' : '○'} Official options and rules verified</li><li className={allRelevanceVerified ? 'ready' : ''}>{allRelevanceVerified ? '✓' : '○'} Contest relevance explicitly verified</li><li className={allClaimsVerified && mappingProblems.length === 0 ? 'ready' : ''}>{allClaimsVerified && mappingProblems.length === 0 ? '✓' : '○'} Every required research cell explicitly saved and verified</li><li className={allConfirmed ? 'ready' : ''}>{allConfirmed ? '✓' : '○'} Every contest explicitly reviewed</li></ul>{mappingProblems.length > 0 && <div className="notice notice-error" role="alert"><strong>Publishing blocked.</strong> {mappingProblems.length} required research {mappingProblems.length === 1 ? 'cell or reference is' : 'cells or references are'} incomplete. Return to Pair & research.</div>}{warnings.length > 0 && <div className="share-warning" role="status"><p className="eyebrow">Publish with warnings</p><h3>This guide contains evidence limitations or human judgment</h3><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><label className="confirm-row"><input checked={warningsAcknowledged} onChange={(event) => setWarningsAcknowledged(event.currentTarget.checked)} type="checkbox" /> I reviewed these amber warnings and want the shared guide to preserve them.</label></div>}<label>Author label<input value={author} onChange={(event) => setAuthor(event.currentTarget.value)} /></label><div className="button-row"><button className="button button-primary" disabled={!canPublish} onClick={async () => { try { const guide = await create(); onSnapshot(guide); const result = buildPeerGuideUrl(guide, window.location.href.split('#')[0]); setShareUrl(result.url); setShareMessage(result.withinTarget ? 'Snapshot is saved locally and within the 4,000-character pilot target.' : 'Snapshot is saved locally but exceeds the target; monitor pilot reliability.'); } catch (cause) { setShareMessage(cause instanceof Error ? cause.message : 'Could not build the snapshot.'); } }} type="button">{warnings.length ? 'Create snapshot with warnings' : 'Create share snapshot'}</button><button className="button button-secondary" disabled={!canPublish} onClick={async () => { try { const guide = await create(); onSnapshot(guide); download('peer-sample-ballot.json', guideJson(guide)); setShareMessage('Peer guide JSON exported.'); } catch (cause) { setShareMessage(cause instanceof Error ? cause.message : 'Could not export the snapshot.'); } }} type="button">{warnings.length ? 'Export guide with warnings' : 'Export peer guide JSON'}</button><button className="button button-secondary" onClick={() => window.print()} type="button">Print / save PDF</button></div>{shareMessage && <p className="notice" role="status">{shareMessage}</p>}{shareUrl && <div className="share-result"><label>Self-contained review link<textarea readOnly value={shareUrl} /></label><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setShareMessage('Copied the immutable snapshot link.'); } catch { setShareMessage('Clipboard access failed. Select and copy the link above.'); } }} type="button">Copy link</button></div>}</section>
  </main>;
}
