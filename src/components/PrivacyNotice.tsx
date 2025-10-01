import React from 'react';

interface PrivacyNoticeProps {
  onClose: () => void;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ onClose }) => {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="privacy-title">Privacy & Disclaimers</h2>
          <div className="modal-header-actions">
            <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <p>
            All of your data lives in your browser&apos;s local storage. There are no accounts, no servers, and no
            analytics unless you opt in. Clearing your browser storage or using a different device will remove your
            topics and ballots.
          </p>
          <p>
            Exports you create (JSON, PDF, JPEG) are generated on your device. When you copy prompts or share links we
            only use the information needed for that action and we never transmit your preferences anywhere.
          </p>
          <p>
            Voting Topics is a community tool provided as-is. It does not provide legal advice, confirm election rules,
            or guarantee ballot accuracy. Always verify information with your local election authority before voting.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" type="button" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
};
