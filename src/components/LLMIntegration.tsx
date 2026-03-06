import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { parseIncomingPreferenceSet, parseIncomingBallot, type PreferenceSet } from '../schema';
import { buildTemplate, buildBallot } from '../exporters';
import { ImportPreview } from './ImportPreview';
import { mergePreferenceSets, mergePreferenceSetsSelective } from '../utils/merge';
import type { PromptPack, PromptItem } from '../utils/prompt';
import { renderTemplate } from '../utils/prompt';
import { toast } from '../utils/toast';

const formatErrorBlock = (summary: string, issues: Array<{ path: string; message: string }> | null = null) => {
  const lines = [
    'Fix this JSON to satisfy the schema and return only corrected JSON.',
    '',
    summary,
  ];
  if (issues?.length) {
    lines.push('', ...issues.map((issue) => `- ${issue.path || '(root)'}: ${issue.message}`));
  }
  return lines.join('\n');
};

const schemaDocs = `# Voting Topics Builder - Schema Documentation

## Preference Set Schema (tsb.v2)

\`\`\`json
{
  "version": "tsb.v2",
  "title": "My Voting Preferences",
  "notes": "Optional notes",
  "topics": [
    {
      "id": "topic-housing",
      "title": "Housing",
      "importance": 4,
      "stance": "neutral",
      "notes": "",
      "sources": [],
      "relations": { "broader": [], "narrower": [], "related": [] }
    }
  ],
  "items": [
    {
      "id": "item-housing-1",
      "text": "Housing costs take a smaller share of income",
      "stars": 5,
      "notes": "",
      "sources": [],
      "topicIds": ["topic-housing"],
      "tags": []
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
\`\`\`

Topics are the priority buckets. Items are the specific outcomes and can belong to multiple topics through \`topicIds\`.

## Ballot Schema (tsb.ballot.v1)

The ballot schema is unchanged, but reasoning links can reference either a topic or an item.
`;

export const LLMIntegration: React.FC = () => {
  const ballotMode = useStore((state) => state.ballotMode);
  const setBallotMode = useStore((state) => state.setBallotMode);
  const clearAll = useStore((state) => state.clearAll);
  const clearBallot = useStore((state) => state.clearBallot);
  const currentBallot = useStore((state) => state.currentBallot);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<Array<{ path: string; message: string }> | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [promptPack, setPromptPack] = useState<PromptPack | null>(null);
  const [activePrompt, setActivePrompt] = useState<PromptItem | null>(null);
  const [promptVars, setPromptVars] = useState<Record<string, string | number>>({});
  const [previewData, setPreviewData] = useState<{ current: PreferenceSet; incoming: PreferenceSet } | null>(null);

  const currentPreferenceSet = useMemo(() => {
    const state = useStore.getState();
    return {
      version: 'tsb.v2' as const,
      title: state.title || 'Untitled',
      notes: state.notes || '',
      topics: state.topics || [],
      items: state.items || [],
      createdAt: state.__createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [ballotMode, currentBallot]);

  useEffect(() => {
    import('../prompt-packs/core.en.json')
      .then((module) => setPromptPack((module as any).default as PromptPack))
      .catch(() => setPromptPack(null));
  }, []);

  const exportState = useMemo(() => {
    try {
      if (ballotMode === 'ballot' && currentBallot) {
        return { json: JSON.stringify(buildBallot(), null, 2), error: null as string | null };
      }
      return { json: JSON.stringify(buildTemplate(), null, 2), error: null as string | null };
    } catch (error) {
      return { json: '', error: error instanceof Error ? error.message : String(error) };
    }
  }, [ballotMode, currentBallot, currentPreferenceSet]);

  const exportErrorBlock = exportState.error ? formatErrorBlock(`Export validation failed: ${exportState.error}`) : null;

  const handleImport = () => {
    if (!importJson.trim()) {
      setImportError('Please paste JSON data');
      return;
    }

    try {
      const data = JSON.parse(importJson);
      if (data.version === 'tsb.v2' || data.version === 'tsb.v1' || data.version === 'tsb.v0') {
        const preferenceSet = parseIncomingPreferenceSet(data);
        if (currentPreferenceSet.topics.length > 0 || currentPreferenceSet.items.length > 0) {
          setPreviewData({ current: currentPreferenceSet, incoming: preferenceSet });
          setImportError(null);
          setImportSuccess(null);
        } else {
          clearAll();
          useStore.setState({
            title: preferenceSet.title,
            notes: preferenceSet.notes || '',
            topics: preferenceSet.topics,
            items: preferenceSet.items,
            __createdAt: preferenceSet.createdAt,
          });
          setImportSuccess('Preference set imported successfully.');
          setBallotMode('preference');
          setImportJson('');
        }
      } else if (data.version === 'tsb.ballot.v1') {
        const ballot = parseIncomingBallot(data);
        const previous = useStore.getState().currentBallot;
        clearBallot();
        useStore.setState({ currentBallot: ballot });
        setImportSuccess('Ballot imported successfully.');
        toast.show({
          variant: 'success',
          title: 'Ballot imported',
          message: 'View the imported ballot now?',
          actionLabel: 'View Ballot',
          onAction: () => setBallotMode('ballot'),
          duration: 7000,
        });
        if (previous) {
          toast.show({
            variant: 'info',
            message: 'Previous ballot can be restored',
            actionLabel: 'Undo Replace',
            onAction: () => { useStore.setState({ currentBallot: previous }); },
            duration: 7000,
          });
        }
      } else {
        setImportError('Unknown data format. Expected tsb.v2, tsb.v1, tsb.v0, or tsb.ballot.v1');
      }

      setImportIssues(null);
    } catch (error: any) {
      if (error && Array.isArray(error.issues)) {
        const issues = error.issues.map((issue: any) => ({ path: (issue.path || []).join('.'), message: issue.message }));
        setImportIssues(issues);
        setImportError('Validation failed. See details below.');
      } else {
        setImportIssues(null);
        setImportError(error instanceof Error ? error.message : 'Invalid JSON');
      }
    }
  };

  const importErrorBlock = importError ? formatErrorBlock(importError, importIssues) : null;

  return (
    <div className="llm-integration">
      <div className="llm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn ghost" onClick={() => window.dispatchEvent(new Event('vt-close-llm'))}>
          ← Back to Preferences
        </button>
      </div>

      <div className="llm-header">
        <h1>LLM Integration</h1>
        <p>Export valid JSON for AI workflows, or import model-generated JSON and repair validation issues quickly.</p>
      </div>

      <div className="llm-tabs">
        <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
          Export & Schema
        </button>
        <button className={`tab ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          {activeTab === 'import' ? 'Import' : 'Import JSON'}
        </button>
      </div>

      <div className="llm-content">
        {activeTab === 'export' && (
          <div className="export-section">
            <div className="export-header" style={{ marginBottom: 16 }}>
              <h2>Quick Start with AI</h2>
              <p>Copy your current data, copy the schema, or copy validation errors if your current state is incomplete.</p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn primary" disabled={!!exportState.error} onClick={() => navigator.clipboard.writeText(exportState.json)}>
                  Copy My Data (JSON)
                </button>
                <button className="btn" onClick={() => navigator.clipboard.writeText(schemaDocs)}>
                  Copy Schema Docs
                </button>
                {exportErrorBlock && (
                  <button className="btn warn" onClick={() => navigator.clipboard.writeText(exportErrorBlock)}>
                    Copy Errors
                  </button>
                )}
              </div>
            </div>

            {promptPack && (
              <div style={{ marginBottom: 24 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {promptPack.prompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      className={`btn ${activePrompt?.id === prompt.id ? 'primary' : ''}`}
                      onClick={() => {
                        setActivePrompt(prompt);
                        const defaults = Object.fromEntries(
                          Object.entries(prompt.variables || {}).map(([key, spec]: any) => [key, spec.default ?? (spec.type === 'number' ? 0 : '')]),
                        );
                        setPromptVars(defaults);
                      }}
                    >
                      {prompt.title}
                    </button>
                  ))}
                </div>
                {activePrompt && (
                  <div className="panel" style={{ marginTop: 12 }}>
                    <h3 className="panel-title">{activePrompt.title}</h3>
                    {activePrompt.variables && (
                      <div className="grid" style={{ marginBottom: 12 }}>
                        {Object.entries(activePrompt.variables).map(([name, spec]: any) => (
                          <label key={name}>{name}
                            {spec.type === 'number' ? (
                              <input type="number" className="input" min={spec.min} max={spec.max} value={Number(promptVars[name] ?? spec.default ?? 0)} onChange={(event) => setPromptVars({ ...promptVars, [name]: Number(event.target.value) })} />
                            ) : (
                              <input type="text" className="input" placeholder={spec.placeholder} value={String(promptVars[name] ?? spec.default ?? '')} onChange={(event) => setPromptVars({ ...promptVars, [name]: event.target.value })} />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="prompt-text" style={{ marginBottom: 12 }}>{renderTemplate(activePrompt.text, promptVars)}</div>
                    <button className="btn primary" onClick={() => navigator.clipboard.writeText(renderTemplate(activePrompt.text, promptVars))}>Copy Prompt</button>
                  </div>
                )}
              </div>
            )}

            {exportState.error ? (
              <div className="panel" style={{ marginBottom: 16 }}>
                <h3 className="panel-title">Export Validation</h3>
                <p className="muted">Your current state is not valid export JSON yet. You can still copy the full raw error block back into your LLM.</p>
                <textarea value={exportErrorBlock || ''} readOnly className="json-textarea" rows={10} />
              </div>
            ) : (
              <div className="json-export">
                <textarea value={exportState.json} readOnly className="json-textarea" rows={20} />
                <button onClick={() => navigator.clipboard.writeText(exportState.json)} className="btn primary">Copy to Clipboard</button>
              </div>
            )}

            <div className="schema-documentation">
              <h2>Schema Documentation</h2>
              <textarea value={schemaDocs} readOnly className="schema-textarea" rows={22} />
              <button onClick={() => navigator.clipboard.writeText(schemaDocs)} className="btn primary">Copy Schema to Clipboard</button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="import-section">
            <div className="import-header">
              <h2>Import LLM-Generated JSON</h2>
              <p>Paste JSON data generated by your LLM:</p>
            </div>

            {importError && (
              <div className="error-message">
                <strong>Import Error:</strong> {importError}
              </div>
            )}

            {importIssues && importIssues.length > 0 && (
              <div className="panel" style={{ margin: '12px 0' }}>
                <h3 className="panel-title">Validation Details</h3>
                <ul className="muted" style={{ margin: 0, paddingLeft: 16 }}>
                  {importIssues.map((issue, idx) => (
                    <li key={idx}><code>{issue.path || '(root)'}</code>: {issue.message}</li>
                  ))}
                </ul>
                <textarea value={importErrorBlock || ''} readOnly className="json-textarea" rows={8} style={{ marginTop: 12 }} />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn warn" onClick={() => navigator.clipboard.writeText(importErrorBlock || '')}>Copy Errors</button>
                  <button className="btn ghost" onClick={() => navigator.clipboard.writeText(schemaDocs)}>Copy Schema Docs</button>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="success-message">
                <strong>Success:</strong> {importSuccess}
              </div>
            )}

            <div className="json-import">
              <textarea
                value={importJson}
                onChange={(event) => {
                  setImportJson(event.target.value);
                  setImportError(null);
                  setImportSuccess(null);
                }}
                className="json-textarea"
                placeholder="Paste JSON data here..."
                rows={15}
              />
              <button onClick={handleImport} className="btn primary" disabled={!importJson.trim()}>
                Import JSON
              </button>
            </div>

            {previewData && (
              <ImportPreview
                current={previewData.current}
                incoming={previewData.incoming}
                onCancel={() => setPreviewData(null)}
                onOverwrite={() => {
                  clearAll();
                  useStore.setState({
                    title: previewData.incoming.title,
                    notes: previewData.incoming.notes || '',
                    topics: previewData.incoming.topics,
                    items: previewData.incoming.items,
                    __createdAt: previewData.incoming.createdAt,
                  });
                  setPreviewData(null);
                  setImportSuccess('Preference set overwritten with imported data');
                }}
                onMerge={(accepted?: Set<string>) => {
                  const merged = accepted && accepted.size > 0
                    ? mergePreferenceSetsSelective(previewData.current, previewData.incoming, accepted)
                    : mergePreferenceSets(previewData.current, previewData.incoming);
                  useStore.setState({
                    title: merged.title,
                    notes: merged.notes || '',
                    topics: merged.topics,
                    items: merged.items,
                    __createdAt: merged.createdAt,
                  });
                  setPreviewData(null);
                  setImportSuccess('Imported changes merged successfully');
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
