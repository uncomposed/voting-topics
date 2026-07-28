import { useState } from 'react';
import { fetchArtifactText, parsePortableArtifact, type PortableArtifact } from '../domain/import';

interface Props {
  onAccept: (artifact: PortableArtifact, importedFrom?: string) => void;
}

export function ArtifactImport({ onAccept }: Props) {
  const [raw, setRaw] = useState('');
  const [url, setUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();
  const [pending, setPending] = useState<PortableArtifact | null>(null);
  const [error, setError] = useState('');

  const preview = async (value: string, importedFrom?: string) => {
    try { setPending(await parsePortableArtifact(value)); setSourceUrl(importedFrom); setError(''); }
    catch (cause) { setPending(null); setError(`${cause instanceof Error ? cause.message : 'Import failed.'} Local work was not changed.`); }
  };

  return <details className="card artifact-import">
    <summary>Import a portable artifact</summary>
    <div className="import-tabs">
      <label>Paste Voting Topics JSON<textarea value={raw} onChange={(event) => setRaw(event.currentTarget.value)} placeholder="Paste a profile, election, priority menu, or peer guide." /></label>
      <div className="button-row"><button className="button button-secondary" disabled={!raw.trim()} onClick={() => void preview(raw)} type="button">Validate pasted JSON</button><label className="button button-secondary file-button">Choose JSON file<input accept="application/json,.json" onChange={async (event) => { const file = event.currentTarget.files?.[0]; if (file) { const text = await file.text(); setRaw(text); void preview(text); } event.currentTarget.value = ''; }} type="file" /></label></div>
      <div className="url-import"><label>Public HTTPS or GitHub URL<input type="url" value={url} onChange={(event) => setUrl(event.currentTarget.value)} placeholder="https://github.com/…/blob/…/election.json" /></label><button className="button button-secondary" disabled={!url.trim()} onClick={async () => { try { const fetched = await fetchArtifactText(url); setRaw(fetched.raw); await preview(fetched.raw, fetched.resolvedUrl); } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Could not fetch the artifact.'} Local work was not changed.`); } }} type="button">Fetch and validate</button></div>
    </div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {pending && <section className="import-preview"><p className="eyebrow">Validated · not yet imported</p><h3>{pending.kind === 'profile' ? pending.value.title : pending.kind === 'election' ? pending.value.title : pending.kind === 'menu' ? pending.value.title : pending.value.election.title}</h3><p>{pending.kind === 'profile' ? `${pending.value.topics.length} priorities` : pending.kind === 'election' ? `${pending.value.contests.length} contests` : pending.kind === 'menu' ? `${pending.value.items.length} menu outcomes` : `Peer guide by ${pending.value.authorLabel}`}</p><div className="button-row"><button className="button button-primary" onClick={() => { onAccept(pending, sourceUrl); setPending(null); setRaw(''); }} type="button">Accept into my library</button><button className="button button-secondary" onClick={() => setPending(null)} type="button">Cancel without changes</button></div></section>}
  </details>;
}
