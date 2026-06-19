import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { applyPreferencePatch, describePatchOperation, parsePreferencePatch, type PreferencePatch } from '../patchSchema';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { buildTemplate, buildBallot } from '../exporters';
import { ImportPreview } from './ImportPreview';
import { mergePreferenceSets, mergePreferenceSetsSelective } from '../utils/merge';
import type { PromptPack, PromptItem } from '../utils/prompt';
import { renderTemplate } from '../utils/prompt';
import { toast } from '../utils/toast';

export const LLMIntegration: React.FC = () => {
  const ballotMode = useStore(state => state.ballotMode);
  const setBallotMode = useStore(state => state.setBallotMode);
  const clearAll = useStore(state => state.clearAll);
  const clearBallot = useStore(state => state.clearBallot);
  const currentBallot = useStore(state => state.currentBallot);
  
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<Array<{ path: string; message: string }> | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [promptPack, setPromptPack] = useState<PromptPack | null>(null);
  const [activePrompt, setActivePrompt] = useState<PromptItem | null>(null);
  const [promptVars, setPromptVars] = useState<Record<string, string | number>>({});
  const [previewData, setPreviewData] = useState<{ current: any; incoming: any } | null>(null);

  const currentPreferenceSet = useMemo(() => {
    const s = useStore.getState();
    return {
      version: 'tsb.v1' as const,
      title: s.title || 'Untitled',
      notes: s.notes || '',
      topics: s.topics || [],
      createdAt: s.__createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [ballotMode, currentBallot]);

  const patchDocs = `# Voting Topics Builder - AI Patch Schema (tsb.patch.v1)

Use patches when an AI should propose focused changes to an existing preference set instead of replacing the whole JSON document. Return only JSON.

\`\`\`json
{
  "version": "tsb.patch.v1",
  "summary": "Add source citations and topic tags for housing preferences.",
  "operations": [
    { "op": "create_topic", "id": "topic-climate", "title": "Climate", "importance": 4, "stance": "for" },
    { "op": "create_item", "id": "item-climate-1", "text": "Prioritize clean energy investment", "stars": 5, "topicIds": ["topic-climate"], "tags": ["energy"] },
    { "op": "add_item_tag", "itemId": "item-climate-1", "tag": "infrastructure" },
    { "op": "add_topic_source", "topicId": "topic-climate", "source": { "label": "Official climate plan", "url": "https://example.org/climate" } }
  ]
}
\`\`\`

Supported operations: create_topic, update_topic, create_item, update_item, add_topic_source, add_item_source, add_item_tag, tag_item_to_topic, remove_item_tag, remove_item_from_topic, delete_topic, delete_item, noop.
`;


  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'patch'>('export');
  const [patchJson, setPatchJson] = useState('');
  const [patchPreview, setPatchPreview] = useState<PreferencePatch | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [patchResult, setPatchResult] = useState<string | null>(null);
  useEffect(() => {
    import('../prompt-packs/core.en.json')
      .then((m) => setPromptPack((m as any).default as PromptPack))
      .catch(() => setPromptPack(null));
  }, []);

  const handleImport = () => {
    if (!importJson.trim()) {
      setImportError('Please paste JSON data');
      return;
    }

    try {
      const data = JSON.parse(importJson);
      
      // Try to determine if it's a preference set or ballot
      if (data.version === 'tsb.v1' || data.version === 'tsb.v0') {
        // It's a preference set
        const preferenceSet = parseIncomingPreferenceSet(data);
        if ((currentPreferenceSet.topics?.length || 0) > 0) {
          setPreviewData({ current: currentPreferenceSet, incoming: preferenceSet });
          setImportError(null);
          setImportSuccess(null);
        } else {
          clearAll();
          useStore.setState({
            title: preferenceSet.title,
            notes: preferenceSet.notes || '',
            topics: preferenceSet.topics,
            __createdAt: preferenceSet.createdAt
          });
          setImportSuccess('Preference set imported successfully!');
          setBallotMode('preference');
          setImportJson('');
        }
      } else if (data.version === 'tsb.ballot.v1') {
        // It's a ballot
        const ballot = parseIncomingBallot(data);
        const prev = useStore.getState().currentBallot;
        clearBallot();
        useStore.setState({ currentBallot: ballot });
        setImportSuccess('Ballot imported successfully!');
        toast.show({
          variant: 'success',
          title: 'Ballot imported',
          message: 'View the imported ballot now?',
          actionLabel: 'View Ballot',
          onAction: () => setBallotMode('ballot'),
          duration: 7000,
        });
        if (prev) {
          toast.show({
            variant: 'info',
            message: 'Previous ballot can be restored',
            actionLabel: 'Undo Replace',
            onAction: () => { useStore.setState({ currentBallot: prev }); },
            duration: 7000,
          });
        }
      } else {
        setImportError('Unknown data format. Expected tsb.v1, tsb.v0, or tsb.ballot.v1');
      }
      
      if (!previewData) setImportJson('');
      setImportIssues(null);
    } catch (error: any) {
      // Capture Zod issues when available
      if (error && Array.isArray(error.issues)) {
        setImportIssues(error.issues.map((i: any) => ({ path: (i.path || []).join('.'), message: i.message })));
        setImportError('Validation failed. See details below.');
      } else {
        setImportIssues(null);
        setImportError(error instanceof Error ? error.message : 'Invalid JSON');
      }
    }
  };

  // (Duplicate lazy load removed; prompt pack is already loaded above)

  const getSchemaDocumentation = () => {
    return `# Voting Topics Builder - Schema Documentation

## Purpose
This tool helps voters organize their positions on ballot measures and candidate races with a collaborative, nuance-focused approach. It separates stance (topic-level position) from directions (specific outcomes with individual importance ratings).

## Preference Set Schema (tsb.v1)

\`\`\`json
{
  "version": "tsb.v1",
  "title": "My Voting Preferences",
  "notes": "Optional notes about this preference set",
  "topics": [
    {
      "id": "unique-topic-id",
      "title": "Topic Name",
      "importance": 4,
      "stance": "lean_for",
      "directions": [
        {
          "id": "unique-direction-id",
          "text": "Specific desired outcome",
          "stars": 5,
          "notes": "Optional notes",
          "sources": [
            {
              "label": "Source name",
              "url": "https://example.com"
            }
          ],
          "tags": ["tag1", "tag2"]
        }
      ],
      "notes": "Optional topic notes",
      "sources": [
        {
          "label": "Source name",
          "url": "https://example.com"
        }
  const aiPatchBundle = useMemo(() => JSON.stringify({
    instructions: 'Review the current preference set and return a tsb.patch.v1 JSON patch with focused, schema-valid proposals only. Prefer additive operations and cite sources with URLs when adding factual context.',
    currentPreferenceSet,
    patchSchema: patchDocs,
  }, null, 2), [currentPreferenceSet]);

  const handlePreviewPatch = () => {
    if (!patchJson.trim()) {
      setPatchError('Please paste patch JSON.');
      return;
    }
    try {
      setPatchPreview(parsePreferencePatch(JSON.parse(patchJson)));
      setPatchError(null);
      setPatchResult(null);
    } catch (error) {
      setPatchPreview(null);
      setPatchError(error instanceof Error ? error.message : 'Invalid patch JSON');
    }
  };

  const handleApplyPatch = () => {
    if (!patchPreview) return;
    const state = useStore.getState();
    const result = applyPreferencePatch({ topics: state.topics, items: state.items }, patchPreview);
    useStore.setState({ topics: result.topics, items: result.items });
    setPatchResult(`Applied ${result.applied.length} operation(s); skipped ${result.skipped.length}.`);
    setPatchPreview(null);
    setPatchJson('');
  };

        <button className={`tab ${activeTab === 'patch' ? 'active' : ''}`} onClick={() => setActiveTab('patch')}>
          AI Patch
        </button>
      ],
      "relations": {
        "broader": ["broader-topic-id"],
        "narrower": ["narrower-topic-id"],
        "related": ["related-topic-id"]
      }
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Stance Values
- "against": Strongly Against
- "lean_against": Lean Against
- "neutral": Neutral
- "lean_for": Lean For
- "for": Strongly For

### Importance & Stars
- Both topic importance and direction stars use 0-5 scale
- 0 = Not important, 5 = Very important

## Ballot Schema (tsb.ballot.v1)

\`\`\`json
{
  "version": "tsb.ballot.v1",
  "title": "2024 General Election Ballot",
  "election": {
    "name": "2024 General Election",
    "date": "2024-11-05",
    "location": "Portland, OR",
    "type": "general",
    "jurisdiction": "City of Portland, Multnomah County, Oregon"
  },
  "offices": [
    {
      "id": "unique-office-id",
      "title": "Mayor",
      "description": "Chief executive of the city",
      "candidates": [
        {
          "id": "unique-candidate-id",
          "name": "John Smith",
          "party": "Democratic",
          "description": "Incumbent mayor with focus on housing",
          "website": "https://johnsmith.com",
          "score": 4,
          "sources": [
            {
              "label": "Campaign website",
              "url": "https://johnsmith.com"
            }
          ]
        }
      ],
      "reasoning": [
        {
          "type": "topic",
          "topicId": "housing-topic-id",
          "relevance": "Candidate's housing policy aligns with my priorities",
          "weight": 4
        }
      ]
    }
  ],
  "measures": [
    {
      "id": "unique-measure-id",
      "title": "Measure 110",
      "description": "Housing bond measure",
      "position": "yes",
      "reasoning": [],
      "sources": []
    }
  ],
  "metadata": {
    "preferenceSetId": "optional-reference-to-preference-set",
    "notes": "Optional ballot notes",
    "sources": [],
    "tags": []
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Election Types
- "primary": Primary election
- "general": General election
- "special": Special election
- "runoff": Runoff election

### Measure Positions
- "yes": Support the measure
- "no": Oppose the measure
- "abstain": No position

### Reasoning Types
- "topic": Links to entire topic
- "direction": Links to specific direction within topic

## Usage Instructions



        {activeTab === 'patch' && (
          <div className="import-section">
            <div className="import-header">
              <h2>AI-Assisted Patch Workflow</h2>
              <p>Export a bundle for an AI assistant, then paste its focused patch here for review before applying it.</p>
            </div>

            <div className="panel" style={{ marginBottom: 16 }}>
              <h3 className="panel-title">1. Export enrichment bundle</h3>
              <p className="muted">The bundle includes your current preference set, instructions, and the patch schema. The AI should return only <code>tsb.patch.v1</code> JSON.</p>
              <textarea value={aiPatchBundle} readOnly className="json-textarea" rows={10} />
              <button className="btn primary" onClick={() => navigator.clipboard.writeText(aiPatchBundle)}>Copy AI Bundle</button>
            </div>

            <div className="panel" style={{ marginBottom: 16 }}>
              <h3 className="panel-title">2. Preview returned patch</h3>
              {patchError && <div className="error-message"><strong>Patch Error:</strong> {patchError}</div>}
              {patchResult && <div className="success-message"><strong>Success:</strong> {patchResult}</div>}
              <textarea
                value={patchJson}
                onChange={(event) => {
                  setPatchJson(event.target.value);
                  setPatchError(null);
                  setPatchResult(null);
                }}
                className="json-textarea"
                placeholder="Paste tsb.patch.v1 JSON here..."
                rows={12}
              />
              <button className="btn primary" onClick={handlePreviewPatch} disabled={!patchJson.trim()}>Preview Patch</button>
            </div>

            {patchPreview && (
              <div className="panel">
                <h3 className="panel-title">Patch Preview</h3>
                {patchPreview.summary && <p>{patchPreview.summary}</p>}
                <ol className="muted" style={{ paddingLeft: 20 }}>
                  {patchPreview.operations.map((operation, idx) => (
                    <li key={idx}>{describePatchOperation(operation)}</li>
                  ))}
                </ol>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn primary" onClick={handleApplyPatch}>Apply Patch</button>
                  <button className="btn ghost" onClick={() => setPatchPreview(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

1. **Export Current Data**: Copy the JSON from the export section
2. **Share with LLM**: Provide this schema documentation and your JSON data to your LLM
3. **LLM Generates**: Ask the LLM to create or modify preference sets/ballots
4. **Import Results**: Paste the LLM-generated JSON into the import section

## Example Prompts for LLM

### For Preference Sets:
"Based on this preference set schema, create a preference set for someone who prioritizes environmental protection, affordable housing, and public transportation. Include 5-7 topics with multiple directions each."

### For Ballots:
"Based on this ballot schema and the provided preference set, create a sample ballot for the 2024 Portland mayoral election. Link candidate choices to relevant preference topics with reasoning."

## Security Note
This tool validates all imported JSON against the schema. Invalid data will be rejected with error messages.`;
  };

  const getCurrentDataJson = () => {
    try {
      if (ballotMode === 'ballot' && currentBallot) {
        return JSON.stringify(buildBallot(), null, 2);
      } else {
        return JSON.stringify(buildTemplate(), null, 2);
      }
    } catch (error) {
      return `Error generating JSON: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  return (
    <div className="llm-integration">
      <div className="llm-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button className="btn ghost" onClick={() => window.dispatchEvent(new Event('vt-close-llm'))}>
          ← Back to Preferences
        </button>
      </div>
      <div className="llm-header">
        <h1>🤖 LLM Integration</h1>
        <p>Export your data for AI analysis or import AI-generated content. Perfect for getting help with topic generation, direction refinement, and ballot creation.</p>
      </div>

      <div className="llm-tabs">
        <button 
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export & Schema
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
          aria-hidden={activeTab === 'import'}
        >
          Import JSON
        </button>
      </div>

      <div className="llm-content">
        {activeTab === 'export' && (
          <div className="export-section">
            {/* Quick Start */}
            <div className="export-header" style={{ marginBottom: 16 }}>
              <h2>🚀 Quick Start with AI</h2>
              <p>Copy your current data and ask your LLM to help. Prompts below assume it has your data and can request the schema if needed.</p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn primary" onClick={() => navigator.clipboard.writeText(getCurrentDataJson())}>Copy My Data (JSON)</button>
                <button className="btn" onClick={() => navigator.clipboard.writeText(getSchemaDocumentation())}>Copy Schema Docs</button>
              </div>
            </div>

            {/* Prompt Packs */}
            {promptPack && (
              <div style={{ marginBottom: 24 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {promptPack.prompts.map((p) => (
                    <button
                      key={p.id}
                      className={`btn ${activePrompt?.id === p.id ? 'primary' : ''}`}
                      onClick={() => {
                        setActivePrompt(p);
                        const defaults = Object.fromEntries(
                          Object.entries(p.variables || {}).map(([k, v]: any) => [k, v.default ?? (v.type === 'number' ? 0 : '')])
                        );
                        setPromptVars(defaults);
                      }}
                    >
                      {p.title}
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
                              <input
                                type="number"
                                className="input"
                                min={spec.min}
                                max={spec.max}
                                value={Number(promptVars[name] ?? spec.default ?? 0)}
                                onChange={(e) => setPromptVars({ ...promptVars, [name]: Number(e.target.value) })}
                              />
                            ) : (
                              <input
                                type="text"
                                className="input"
                                placeholder={spec.placeholder}
                                value={String(promptVars[name] ?? spec.default ?? '')}
                                onChange={(e) => setPromptVars({ ...promptVars, [name]: e.target.value })}
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="prompt-text" style={{ marginBottom: 12 }}>
                      {renderTemplate(activePrompt.text, promptVars)}
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => navigator.clipboard.writeText(renderTemplate(activePrompt.text, promptVars))}
                    >
                      Copy Prompt
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="export-header">
              <h2>📋 Copy to Chat</h2>
              <p>Copy this JSON to share with your language model:</p>
            </div>
            
            <div className="json-export">
              <textarea
                value={getCurrentDataJson()}
                readOnly
                className="json-textarea"
                rows={20}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(getCurrentDataJson())}
                className="btn primary"
              >
                Copy to Clipboard
              </button>
            </div>

            <div className="schema-documentation">
              <h2>Schema Documentation</h2>
              <p>Share this documentation with your LLM so it understands the data format:</p>
              
              <textarea
                value={getSchemaDocumentation()}
                readOnly
                className="schema-textarea"
                rows={30}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(getSchemaDocumentation())}
                className="btn primary"
              >
                Copy Schema to Clipboard
              </button>
            </div>

            {promptPack && (
              <div style={{ marginBottom: 24 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {promptPack.prompts.map(p => (
                    <button key={p.id} className={`btn ${activePrompt?.id === p.id ? "primary" : ""}`} onClick={() => { setActivePrompt(p); setPromptVars(Object.fromEntries(Object.entries(p.variables || {}).map(([k,v]) => [k, (v as any).default ?? ((v as any).type==="number"?0: "")]))); }}>
                      {p.title}
                    </button>
                  ))}
                </div>
                {activePrompt && (
                  <div className="panel" style={{ marginTop: 12 }}>
                    <h3 className="panel-title">{activePrompt.title}</h3>
                    {activePrompt.variables && (
                      <div className="grid" style={{ marginBottom: 12 }}>
                        {Object.entries(activePrompt.variables).map(([name, spec]) => (
                          <label key={name}>{name}
                            {(spec as any).type === "number" ? (
                              <input type="number" className="input" min={(spec as any).min} max={(spec as any).max} value={Number(promptVars[name] ?? (spec as any).default ?? 0)} onChange={(e) => setPromptVars({ ...promptVars, [name]: Number(e.target.value) })} />
                            ) : (
                              <input type="text" className="input" placeholder={(spec as any).placeholder} value={String(promptVars[name] ?? (spec as any).default ?? "")} onChange={(e) => setPromptVars({ ...promptVars, [name]: e.target.value })} />
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

            <div className="example-prompts">
              <h2>💡 Example Prompts for Your AI</h2>
              <p>Try these prompts with your language model:</p>
              
              <div className="prompt-examples">
                <div className="prompt-example">
                  <h3>Generate Topics:</h3>
                  <div className="prompt-text">
                    "Based on this preference set schema, create a preference set for someone who prioritizes environmental protection, affordable housing, and public transportation. Include 5-7 topics with multiple directions each."
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText('Based on this preference set schema, create a preference set for someone who prioritizes environmental protection, affordable housing, and public transportation. Include 5-7 topics with multiple directions each.')}
                    className="btn ghost"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    Copy Prompt
                  </button>
                </div>

                <div className="prompt-example">
                  <h3>Refine Directions:</h3>
                  <div className="prompt-text">
                    "Review this preference set and suggest more specific, actionable directions for each topic. Make them more concrete and measurable."
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText('Review this preference set and suggest more specific, actionable directions for each topic. Make them more concrete and measurable.')}
                    className="btn ghost"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    Copy Prompt
                  </button>
                </div>

                <div className="prompt-example">
                  <h3>Create Ballot:</h3>
                  <div className="prompt-text">
                    "Based on this ballot schema and the provided preference set, create a sample ballot for the 2024 Portland mayoral election. Link candidate choices to relevant preference topics with reasoning."
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText('Based on this ballot schema and the provided preference set, create a sample ballot for the 2024 Portland mayoral election. Link candidate choices to relevant preference topics with reasoning.')}
                    className="btn ghost"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    Copy Prompt
                  </button>
                </div>
              </div>
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
                  {importIssues.map((iss, idx) => (
                    <li key={idx}><code>{iss.path || '(root)'}</code>: {iss.message}</li>
                  ))}
                </ul>
                <div className="muted" style={{ marginTop: 8, fontSize: '0.9rem' }}>
                  Need the exact schema? Use the <em>Copy Schema Docs</em> button in the Export tab.
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
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError(null);
                  setImportSuccess(null);
                }}
                className="json-textarea"
                placeholder="Paste JSON data here..."
                rows={15}
              />
              <button 
                onClick={handleImport}
                className="btn primary"
                disabled={!importJson.trim()}
              >
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
                    __createdAt: previewData.incoming.createdAt
                  });
                  setPreviewData(null);
                  setImportSuccess('Preference set overwritten with imported data');
                  toast.show({
                    variant: 'success',
                    title: 'Preferences imported',
                    message: 'View your updated preferences?',
                    actionLabel: 'View Preferences',
                    onAction: () => setBallotMode('preference'),
                    duration: 7000,
                  });
                }}
                onMerge={(accepted?: Set<string>) => {
                  const merged = accepted && accepted.size > 0
                    ? mergePreferenceSetsSelective(previewData.current, previewData.incoming, accepted)
                    : mergePreferenceSets(previewData.current, previewData.incoming);
                  useStore.setState({
                    title: merged.title,
                    notes: merged.notes || '',
                    topics: merged.topics,
                    __createdAt: merged.createdAt
                  });
                  setPreviewData(null);
                  setImportSuccess('Imported changes merged successfully');
                  toast.show({
                    variant: 'success',
                    title: 'Preferences merged',
                    message: 'View your updated preferences?',
                    actionLabel: 'View Preferences',
                    onAction: () => setBallotMode('preference'),
                    duration: 7000,
                  });
                }}
              />
            )}

            <div className="import-help">
              <h3>Import Help</h3>
              <ul>
                <li>Supports preference sets (tsb.v1, tsb.v0) and ballots (tsb.ballot.v1)</li>
                <li>All data is validated against the schema</li>
                <li>Invalid JSON will be rejected with error messages</li>
                <li>Importing will replace your current data</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
