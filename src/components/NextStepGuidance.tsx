import React from 'react';
import { useStore } from '../store';

export const NextStepGuidance: React.FC = () => {
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const hintsEnabled = useStore(state => state.hintsEnabled);
  const setHintsEnabled = useStore(state => state.setHintsEnabled);

  const step = (() => {
    switch (currentFlowStep) {
      case 'starter':
        return {
          current: 'Getting Started',
          next: 'Select topics from the starter pack below',
          action: 'starter-pack'
        };
      case 'cards':
        return {
          current: 'Sorting Priorities',
          next: 'Drag topics between priority levels to organize them',
          action: 'sort-priorities'
        };
      case 'list':
        return {
          current: 'Adding Details',
          next: 'Add specific directions and details for each topic',
          action: 'add-details'
        };
      case 'complete':
      default:
        return {
          current: 'Preference Set Complete',
          next: 'Export your preferences or create a sample ballot',
          action: 'export-or-ballot'
        };
    }
  })();

  const getActionButton = () => {
    switch (step.action) {
      case 'starter-pack':
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Use the starter pack below to get started quickly
          </div>
        );
      case 'sort-priorities':
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Drag topics between columns to set their priority levels
          </div>
        );
      case 'add-details':
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Click on topics to add specific directions and details
          </div>
        );
      case 'export-or-ballot':
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Use the buttons below to export or create a ballot
          </div>
        );
      default:
        return null;
    }
  };

  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(139, 211, 255, 0.1) 0%, rgba(100, 255, 161, 0.05) 100%)',
    border: '1px solid rgba(139, 211, 255, 0.3)',
    borderRadius: 8,
    // Match topic card horizontal rail (14px) to avoid left-edge drift on iOS
    padding: '14px 14px',
    marginBottom: 16,
    display: 'block',
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
  };

  const renderHintSection = () => {
    if (hintsEnabled) {
      return (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎯</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '600', color: 'var(--accent)', lineHeight: 1.3 }}>
                  {step.current}
                </div>
                <div className="muted" style={{ fontSize: '0.9rem', marginTop: 2 }}>
                  <strong style={{ fontWeight: 600 }}>Next:</strong> {step.next}
                </div>
              </div>
            </div>
            <div
              className="muted"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="btn ghost"
                style={{ padding: '2px 6px', whiteSpace: 'nowrap' }}
                onClick={() => setHintsEnabled(false)}
              >
                Disable Hint Mode
              </button>
              <button
                className="btn ghost"
                style={{ padding: '2px 6px', whiteSpace: 'nowrap' }}
                onClick={() => window.dispatchEvent(new Event('vt-open-getting-started'))}
              >
                Open Getting Started Guide
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>{getActionButton()}</div>
        </>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--focus)' }}>Bring your own AI</div>
            <div className="muted" style={{ fontSize: '0.9rem' }}>
              Hint mode is off. Use the AI helper to brainstorm topics or draft ballots when you need a boost.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            style={{ padding: '4px 10px' }}
            onClick={() => window.dispatchEvent(new Event('vt-open-llm'))}
          >
            Open AI Assistant
          </button>
          <button
            className="btn ghost"
            style={{ padding: '4px 10px' }}
            onClick={() => setHintsEnabled(true)}
          >
            Re-enable hints
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="next-step-guidance" style={containerStyle}>
      {renderHintSection()}

      {currentFlowStep === 'complete' && (
        <>
          <div style={{
            marginTop: 12,
            padding: '12px 16px',
            background: 'rgba(100, 255, 161, 0.1)',
            border: '1px solid rgba(100, 255, 161, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            maxWidth: 840,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🎉</span>
              <span style={{ fontWeight: '600', color: 'var(--accent)' }}>
                Great job! Your preferences are ready
              </span>
            </div>
            <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
              Now you can compare your preferences with others or create a sample ballot.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                style={{ fontSize: '0.9rem' }}
                onClick={() => window.dispatchEvent(new Event('vt-open-comparison'))}
              >
                Compare with Others
              </button>
              <button
                className="btn"
                style={{ fontSize: '0.9rem' }}
                onClick={() => window.dispatchEvent(new Event('vt-create-ballot'))}
              >
                Create Sample Ballot
              </button>
            </div>
          </div>
          
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(155, 130, 255, 0.1)',
            border: '1px solid rgba(155, 130, 255, 0.3)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            maxWidth: 840,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
              <span style={{ fontSize: '1rem' }}>🤖</span>
              <span style={{ fontWeight: '600', color: 'var(--focus)' }}>
                Pro Tip: Use with AI
              </span>
            </div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              Export your data and ask your language model to help generate topics, refine directions, or create sample ballots.
              <button
                className="btn ghost"
                style={{
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  marginLeft: '6px',
                  textDecoration: 'underline'
                }}
                onClick={() => {
                  window.dispatchEvent(new Event('vt-open-llm'));
                }}
              >
                Try LLM Integration →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
