import React, { useState } from 'react';
import { TemplateDiffView } from './TemplateDiffView';
import { parseIncomingTemplate } from '../schema';
import type { Template } from '../schema';

interface DiffComparisonProps {
  onClose: () => void;
}

export const DiffComparison: React.FC<DiffComparisonProps> = ({ onClose }) => {
  const [leftTemplate, setLeftTemplate] = useState<Template | null>(null);
  const [rightTemplate, setRightTemplate] = useState<Template | null>(null);
  const [step, setStep] = useState<'upload' | 'compare'>('upload');
  const [error, setError] = useState<string>('');

  const handleFileUpload = (file: File, side: 'left' | 'right') => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        const parsed = parseIncomingTemplate(obj);
        
        if (side === 'left') {
          setLeftTemplate(parsed);
        } else {
          setRightTemplate(parsed);
        }
        setError('');
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : String(e);
        setError(`Failed to parse ${side} template: ${error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCompare = () => {
    if (leftTemplate && rightTemplate) {
      setStep('compare');
    }
  };



  if (step === 'compare' && leftTemplate && rightTemplate) {
    return (
      <TemplateDiffView
        leftTemplate={leftTemplate}
        rightTemplate={rightTemplate}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="diff-comparison">
      <div className="diff-comparison-header">
        <h2>Compare Templates</h2>
        <button onClick={onClose} className="btn ghost">
          ✕ Close
        </button>
      </div>

      <div className="diff-comparison-content">
        <div className="upload-section">
          <div className="upload-card">
            <h3>Template A</h3>
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
                {leftTemplate ? (
                  <div className="file-selected">
                    <span className="file-name">{leftTemplate.title}</span>
                    <span className="file-meta">
                      {leftTemplate.topics.length} topics
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
          </div>

          <div className="upload-card">
            <h3>Template B</h3>
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
                {rightTemplate ? (
                  <div className="file-selected">
                    <span className="file-name">{rightTemplate.title}</span>
                    <span className="file-meta">
                      {rightTemplate.topics.length} topics
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
            disabled={!leftTemplate || !rightTemplate}
            className="btn primary"
          >
            Compare Templates
          </button>
        </div>

        <div className="help-text">
          <h4>How to use:</h4>
          <ol>
            <li>Upload two JSON template files (exported from this app)</li>
            <li>Click "Compare Templates" to see detailed differences</li>
            <li>Explore the Overview, Topic Details, and Priority Heatmap tabs</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
