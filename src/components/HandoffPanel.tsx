import { useState } from 'react';
import { createHandoffTask, parseProposal, renderHandoffMarkdown, validateProposalReferences, validateProposalScope, type Proposal } from '../domain/handoff';
import { digestValue } from '../domain/portable';
import { PRIORITY_MENU } from '../domain/priority-menu';
import type { ElectionTemplate, ElectionWorkspace, HandoffTask, TopicProfile } from '../domain/schema';

interface Props {
  taskType: HandoffTask['taskType'];
  context: unknown;
  referenceContext?: { profile?: TopicProfile; election?: ElectionTemplate; workspace?: ElectionWorkspace };
  title: string;
  description: string;
  onAccept: (proposal: Proposal, selected: Set<string>, toolLabel?: string) => void;
}

function responseSchemaUrl(task: HandoffTask) {
  return `/schemas/${task.responseVersion.replace(/^vt\./u, '')}.schema.json`;
}

function download(filename: string, value: string, type = 'text/markdown') {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([value], { type }));
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function keysFor(proposal: Proposal): string[] {
  if (proposal.version === 'vt.priority-proposal.v1') return [...proposal.selections.map((item) => `menu:${item.menuItemId}`), ...proposal.customPriorities.map((_, index) => `custom:${index}`)];
  if (proposal.version === 'vt.election-proposal.v1') return ['election'];
  if (proposal.version === 'vt.relevance-proposal.v1') return proposal.contests.map((item) => `contest:${item.contestId}`);
  if (proposal.version === 'vt.assessment-batch.v1') return proposal.assessments.map((item) => `${item.optionId}\u0000${item.topicId}`);
  return proposal.contests.map((item) => `contest:${item.contestId}`);
}

type ReferenceContext = { profile?: TopicProfile; election?: ElectionTemplate; workspace?: ElectionWorkspace };

function electionDiff(current: ElectionTemplate | undefined, proposed: ElectionTemplate): string[] {
  if (!current) return [`New election with ${proposed.contests.length} contest${proposed.contests.length === 1 ? '' : 's'}.`];
  const changes: string[] = [];
  for (const field of ['title', 'electionDate', 'jurisdiction'] as const) if (current[field] !== proposed[field]) changes.push(`${field}: “${current[field]}” → “${proposed[field]}”`);
  for (const contest of proposed.contests) {
    const before = current.contests.find((item) => item.id === contest.id);
    if (!before) { changes.push(`Add contest: ${contest.title} (${contest.method})`); continue; }
    if (before.title !== contest.title || before.method !== contest.method) changes.push(`Update ${before.title}: ${before.method} → ${contest.method}, titled “${contest.title}”`);
    const added = contest.options.filter((option) => !before.options.some((item) => item.id === option.id));
    if (added.length) changes.push(`${contest.title}: add ${added.map((option) => option.name).join(', ')}`);
  }
  if (current.sources.length !== proposed.sources.length) changes.push(`Official sources: ${current.sources.length} → ${proposed.sources.length}`);
  return changes.length ? changes : ['No semantic election changes detected.'];
}

function ProposalRows({ proposal, selected, onToggle, references }: { proposal: Proposal; selected: Set<string>; onToggle: (key: string) => void; references: ReferenceContext }) {
  if (proposal.version === 'vt.priority-proposal.v1') return <div className="proposal-list">
    {proposal.selections.map((item) => <label className="proposal-row" key={item.menuItemId}><input checked={selected.has(`menu:${item.menuItemId}`)} onChange={() => onToggle(`menu:${item.menuItemId}`)} type="checkbox" /><span><strong>{PRIORITY_MENU.items.find((candidate) => candidate.id === item.menuItemId)?.statement ?? item.menuItemId}</strong><small>{item.stars}/5 importance{item.note ? ` · ${item.note}` : ''}</small></span></label>)}
    {proposal.customPriorities.map((item, index) => <label className="proposal-row" key={`${item.statement}-${index}`}><input checked={selected.has(`custom:${index}`)} onChange={() => onToggle(`custom:${index}`)} type="checkbox" /><span><strong>{item.statement}</strong><small>Custom · {item.stars}/5 importance{item.category ? ` · ${item.category}` : ''}</small></span></label>)}
  </div>;
  if (proposal.version === 'vt.election-proposal.v1') return <label className="proposal-row proposal-row-detailed"><input checked={selected.has('election')} onChange={() => onToggle('election')} type="checkbox" /><span><strong>{proposal.election.title}</strong><small>{proposal.election.jurisdiction} · {proposal.election.contests.length} contests · {proposal.election.sources.length} election sources</small><ul>{electionDiff(references.election, proposal.election).map((change) => <li key={change}>{change}</li>)}</ul></span></label>;
  if (proposal.version === 'vt.relevance-proposal.v1') return <div className="proposal-list">{proposal.contests.map((item) => <label className="proposal-row" key={item.contestId}><input checked={selected.has(`contest:${item.contestId}`)} onChange={() => onToggle(`contest:${item.contestId}`)} type="checkbox" /><span><strong>{references.election?.contests.find((contest) => contest.id === item.contestId)?.title ?? item.contestId}</strong><small>{item.topicIds.map((id) => references.profile?.topics.find((topic) => topic.id === id)?.title ?? id).join(' · ')}{item.reason ? ` · ${item.reason}` : ''}</small></span></label>)}</div>;
  if (proposal.version === 'vt.assessment-batch.v1') return <div className="proposal-list">{proposal.assessments.map((item) => {
    const key = `${item.optionId}\u0000${item.topicId}`;
    const contest = references.election?.contests.find((candidate) => candidate.id === proposal.contestId);
    const option = contest?.options.find((candidate) => candidate.id === item.optionId)?.name ?? item.optionId;
    const topic = references.profile?.topics.find((candidate) => candidate.id === item.topicId)?.title ?? item.topicId;
    const sourceLabels = item.status === 'assessed' ? item.sourceIds.map((id) => proposal.sources.find((source) => source.id === id)?.label ?? id).join(', ') : '';
    return <label className="proposal-row proposal-row-detailed" key={key}><input checked={selected.has(key)} onChange={() => onToggle(key)} type="checkbox" /><span><strong>{option} × {topic}</strong><small>{item.status === 'unknown' ? `Unknown · ${item.note ?? 'No reliable evidence found'}` : `${item.stars}/5 fit · ${item.confidence} · ${item.reason}`}</small>{sourceLabels && <small>Evidence: {sourceLabels}</small>}</span></label>;
  })}</div>;
  return <div className="proposal-list">{proposal.contests.map((item) => <label className="proposal-row" key={item.contestId}><input checked={selected.has(`contest:${item.contestId}`)} onChange={() => onToggle(`contest:${item.contestId}`)} type="checkbox" /><span><strong>{references.election?.contests.find((contest) => contest.id === item.contestId)?.title ?? item.contestId}</strong><small>{item.personalNote ?? (item.concerns.join(' · ') || 'Review suggestion')}{item.suggestedOverride ? ' · override suggestion shown for discussion only' : ''}</small></span></label>)}</div>;
}

export function HandoffPanel({ taskType, context, referenceContext, title, description, onAccept }: Props) {
  const [question, setQuestion] = useState('');
  const [toolLabel, setToolLabel] = useState('');
  const [task, setTask] = useState<HandoffTask | null>(null);
  const [packet, setPacket] = useState('');
  const [raw, setRaw] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [repair, setRepair] = useState('');
  const [message, setMessage] = useState('');

  const prepare = async () => {
    const next = await createHandoffTask(taskType, context, question);
    let schema: unknown;
    try { schema = await fetch(responseSchemaUrl(next)).then((response) => response.ok ? response.json() : undefined); } catch { schema = undefined; }
    setTask(next); setPacket(renderHandoffMarkdown(next, schema)); setProposal(null); setErrors([]); setRepair(''); setMessage('Task packet prepared. Your data stays here until you copy or download it.');
  };

  const validate = async () => {
    if (!task) return;
    if (await digestValue(context) !== task.inputDigest) {
      const staleErrors = ['The Voting Topics inputs changed after this task packet was prepared. Prepare a new task packet before accepting a response.'];
      setProposal(null); setErrors(staleErrors); setRepair(['Prepare a new task packet from the current Voting Topics step.', ...staleErrors.map((error) => `- ${error}`)].join('\n')); return;
    }
    const result = parseProposal(raw, task);
    if (result.kind === 'invalid') { setProposal(null); setErrors(result.errors); setRepair(result.repairBrief); return; }
    const referenceErrors = [...validateProposalScope(result.proposal, task), ...validateProposalReferences(result.proposal, referenceContext ?? {})];
    if (referenceErrors.length) { setProposal(null); setErrors(referenceErrors); setRepair(['Correct these references and return one JSON object only:', ...referenceErrors.map((error) => `- ${error}`), '', JSON.stringify(task.example, null, 2)].join('\n')); return; }
    setProposal(result.proposal); setSelected(new Set(keysFor(result.proposal))); setErrors([]); setRepair(''); setMessage('Structurally valid. Review every selected change before accepting it.');
  };

  return <details className="card handoff-panel">
    <summary>Work with a chatbot <span>Optional</span></summary>
    <div className="handoff-body">
      <h3>{title}</h3><p>{description}</p>
      <label>What do you want to discuss or offload?<textarea value={question} onChange={(event) => setQuestion(event.currentTarget.value)} placeholder="Add context, uncertainty, or a question for your chatbot." /></label>
      <button className="button button-secondary" onClick={() => void prepare()} type="button">Prepare task packet</button>
      {task && <>
        <p className="privacy-line">Nothing is sent automatically. Copy the brief into any chatbot, then paste its response below.</p>
        <div className="button-row"><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(packet); setMessage('Copied the task packet.'); } catch { setMessage('Clipboard access failed. Select the packet text and copy it manually.'); } }} type="button">Copy chatbot brief</button><button className="button button-secondary" onClick={() => download(`voting-topics-${taskType}-task.md`, packet)} type="button">Download task packet</button></div>
        <label>Task packet<textarea className="packet-preview" readOnly value={packet} /></label>
        <label>Chatbot label (stored only as provenance)<input value={toolLabel} onChange={(event) => setToolLabel(event.currentTarget.value)} placeholder="Optional, e.g. my usual chatbot" /></label>
        <label>Paste the returned JSON or one JSON code block<textarea value={raw} onChange={(event) => setRaw(event.currentTarget.value)} /></label>
        <label className="button button-secondary file-button">Upload response JSON<input accept="application/json,.json,.txt" onChange={async (event) => { const file = event.currentTarget.files?.[0]; if (file) setRaw(await file.text()); event.currentTarget.value = ''; }} type="file" /></label>
        <button className="button button-primary" disabled={!raw.trim()} onClick={() => void validate()} type="button">Validate and preview</button>
      </>}
      {errors.length > 0 && <div className="notice notice-error" role="alert"><strong>Nothing was changed.</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>{repair && <><label>Repair brief<textarea readOnly value={repair} /></label><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(repair)} type="button">Copy repair brief</button></>}</div>}
      {proposal && <section className="proposal-preview"><h3>Review proposed changes</h3><p>Uncheck anything you reject. To edit a claim before acceptance, change the returned JSON above and validate it again. Nothing below is stored yet.</p><ProposalRows onToggle={(key) => setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} proposal={proposal} references={referenceContext ?? {}} selected={selected} /><button className="button button-primary" disabled={selected.size === 0} onClick={() => { onAccept(proposal, selected, toolLabel.trim() || undefined); setMessage(`Accepted ${selected.size} verified proposal item${selected.size === 1 ? '' : 's'}.`); setProposal(null); setRaw(''); }} type="button">Accept selected verified changes</button></section>}
      {message && <p className="notice notice-success" role="status">{message}</p>}
    </div>
  </details>;
}
