import React from 'react';

interface WelcomeModalProps {
  isSharedView: boolean;
  onDismiss: () => void;
  onOpenGuide: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isSharedView, onDismiss, onOpenGuide }) => {
  const headline = isSharedView ? 'You are viewing a shared preference set' : 'Welcome to Voting Topics Builder';
  const intro = isSharedView
    ? 'Someone shared their preference set with you. Explore their priorities, fork a copy to make it your own, or start from scratch.'
    : 'This workspace helps you capture the outcomes you want from public policy and turn them into a sample ballot.';

  const actions = [
    {
      emoji: '📝',
      title: '1. Capture your priorities',
      body: 'Add topics that matter, then write “directions” — specific outcomes you want under each topic.'
    },
    {
      emoji: '⭐',
      title: '2. Rate importance',
      body: 'Use the 0–5 star scale (0 = skip for now) to show how strongly you care about each direction.'
    },
    {
      emoji: '🗳️',
      title: '3. Build a STAR Voting ballot',
      body: 'Score every candidate in the ballot builder, export, and share your results.'
    }
  ];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 20, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        zIndex: 1600,
        padding: '48px 16px'
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 520,
          width: '90%',
          margin: '80px auto',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 id="welcome-modal-title" style={{ margin: '0 0 8px', color: 'var(--accent)' }}>
              {headline}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>{intro}</p>
          </div>
          <button className="btn ghost" onClick={onDismiss} aria-label="Close welcome dialog">✕</button>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          {actions.map(item => (
            <div
              key={item.title}
              style={{
                border: '1px solid rgba(139, 211, 255, 0.3)',
                background: 'rgba(139, 211, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              <span aria-hidden style={{ fontSize: '1.5rem', lineHeight: 1 }}>{item.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(155, 130, 255, 0.12)',
            border: '1px solid rgba(155, 130, 255, 0.25)',
            color: 'var(--text)'
          }}
        >
          <strong>Tip:</strong> You can reopen this welcome at any time from the toolbar menu.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className="btn ghost" onClick={onOpenGuide}>
            View the full guide
          </button>
          <button className="btn primary" onClick={onDismiss}>
            Got it — let me explore
          </button>
        </div>
      </div>
    </div>
  );
};
