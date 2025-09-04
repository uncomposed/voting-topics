import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { buildTemplate, buildBallot } from '../exporters';
import { ImportPreview } from './ImportPreview';
import { mergePreferenceSets, mergePreferenceSetsSelective } from '../utils/merge';

export const LLMIntegration: React.FC = () => {
  const ballotMode = useStore(state => state.ballotMode);
  const setBallotMode = useStore(state => state.setBallotMode);
  const clearAll = useStore(state => state.clearAll);
  const clearBallot = useStore(state => state.clearBallot);
  const currentBallot = useStore(state => state.currentBallot);
  
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
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
        if (currentBallot) {
          const confirmReplace = confirm('Replace current ballot with imported ballot?');
          if (!confirmReplace) return;
        }
        clearBallot();
        useStore.setState({ currentBallot: ballot });
        setImportSuccess('Ballot imported successfully!');
        setBallotMode('ballot');
      } else {
        setImportError('Unknown data format. Expected tsb.v1, tsb.v0, or tsb.ballot.v1');
      }
      
      if (!previewData) setImportJson('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

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
          "sources": [
            {
              "label": "Campaign website",
              "url": "https://johnsmith.com"
            }
          ]
        }
      ],
      "selectedCandidateId": "unique-candidate-id",
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
        >
          Import JSON
        </button>
      </div>

      <div className="llm-content">
        {activeTab === 'export' && (
          <div className="export-section">
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
                  setBallotMode('preference');
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
                  setBallotMode('preference');
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
