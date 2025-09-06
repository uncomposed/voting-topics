import React, { useState } from 'react';
import { PreferenceSetDiffView } from './PreferenceSetDiffView';
import { parseIncomingPreferenceSet } from '../schema';
import type { PreferenceSet } from '../schema';
import { buildTemplate } from '../exporters';

interface PreferenceSetComparisonProps {
  onClose: () => void;
}

export const PreferenceSetComparison: React.FC<PreferenceSetComparisonProps> = ({ onClose }) => {
  const [leftPreferenceSet, setLeftPreferenceSet] = useState<PreferenceSet | null>(null);
  const [rightPreferenceSet, setRightPreferenceSet] = useState<PreferenceSet | null>(null);
  const [step, setStep] = useState<'upload' | 'compare'>('upload');
  const [error, setError] = useState<string>('');

  // Support global clear event from Toolbar/Menu
  React.useEffect(() => {
    const onClear = () => {
      setLeftPreferenceSet(null);
      setRightPreferenceSet(null);
      setStep('upload');
      setError('');
    };
    window.addEventListener('vt-clear-comparison', onClear as EventListener);
    return () => window.removeEventListener('vt-clear-comparison', onClear as EventListener);
  }, []);

  const handleFileUpload = (file: File, side: 'left' | 'right') => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        const parsed = parseIncomingPreferenceSet(obj);
        
        if (side === 'left') {
          setLeftPreferenceSet(parsed);
        } else {
          setRightPreferenceSet(parsed);
        }
        setError('');
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : String(e);
        setError(`Failed to parse ${side} preference set: ${error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleUrlLoad = async (url: string, side: 'left' | 'right') => {
    try {
      const res = await fetch(url);
      const obj = await res.json();
      const parsed = parseIncomingPreferenceSet(obj);
      if (side === 'left') setLeftPreferenceSet(parsed); else setRightPreferenceSet(parsed);
      setError('');
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      setError(`Failed to load ${side} from URL: ${error}`);
    }
  };

  const handleCompare = () => {
    if (leftPreferenceSet && rightPreferenceSet) {
      setStep('compare');
    }
  };



  if (step === 'compare' && leftPreferenceSet && rightPreferenceSet) {
    return (
      <PreferenceSetDiffView
        leftPreferenceSet={leftPreferenceSet}
        rightPreferenceSet={rightPreferenceSet}
        onClose={onClose}
      />
    );
  }

  return (
      <div className="diff-comparison">
        <div className="diff-comparison-header">
          <h2>Compare Preferences</h2>
          <button onClick={onClose} className="btn ghost">
            ✕ Close
          </button>
        </div>

        <div className="diff-comparison-content">
          <div className="upload-section">
            <div className="upload-card">
            <h3>Set A</h3>
              <div className="upload-area">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'left');
                  }}
                  id="left-file-input"
                  className="file-input"
                />
                <label htmlFor="left-file-input" className="file-label">
                  {leftPreferenceSet ? (
                    <div className="file-selected">
                      <span className="file-name">{leftPreferenceSet.title}</span>
                      <span className="file-meta">
                        {leftPreferenceSet.topics.length} topics
                      </span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <span className="upload-icon">📁</span>
                      <span>Click to upload JSON file</span>
                    </div>
                  )}
                </label>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  className="btn small"
                  onClick={() => setLeftPreferenceSet(buildTemplate() as PreferenceSet)}
                >
                  Use Current
                </button>
                <button className="btn small" onClick={() => {
                  const url = prompt('Paste JSON URL');
                  if (url) handleUrlLoad(url, 'left');
                }}>Load from URL</button>
                {leftPreferenceSet && (
                  <button className="btn small ghost" onClick={() => setLeftPreferenceSet(null)}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="upload-card">
            <h3>Set B</h3>
              <div className="upload-area">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'right');
                  }}
                  id="right-file-input"
                  className="file-input"
                />
                <label htmlFor="right-file-input" className="file-label">
                  {rightPreferenceSet ? (
                    <div className="file-selected">
                      <span className="file-name">{rightPreferenceSet.title}</span>
                      <span className="file-meta">
                        {rightPreferenceSet.topics.length} topics
                      </span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <span className="upload-icon">📁</span>
                      <span>Click to upload JSON file</span>
                    </div>
                  )}
                </label>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  className="btn small"
                  onClick={() => setRightPreferenceSet(buildTemplate() as PreferenceSet)}
                >
                  Use Current
                </button>
                <button className="btn small" onClick={() => {
                  const url = prompt('Paste JSON URL');
                  if (url) handleUrlLoad(url, 'right');
                }}>Load from URL</button>
                {rightPreferenceSet && (
                  <button className="btn small ghost" onClick={() => setRightPreferenceSet(null)}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="compare-actions">
          <button
            onClick={handleCompare}
            disabled={!leftPreferenceSet || !rightPreferenceSet}
            className="btn primary"
          >
            Compare Preferences
          </button>
        </div>

        <div className="help-text">
          <h4>How to use:</h4>
          <ol>
            <li>Upload two JSON preference set files (exported from this app)</li>
            <li>Click "Compare Preferences" to see detailed differences</li>
            <li>Explore the Overview, Topic Details, Priority Heatmap, and Directions tabs</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// Backward compatibility alias
export const DiffComparison = PreferenceSetComparison;
