import React from 'react';
import type { Candidate } from '../../schema';
import { Stars } from '../Stars';

interface CandidateCardProps {
  candidate: Candidate;
  score: number;
  isTopChoice: boolean;
  onScoreChange: (score: number) => void;
  onEdit: () => void;
  onRemove: () => void;
  onOpenReasoning: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  score,
  isTopChoice,
  onScoreChange,
  onEdit,
  onRemove,
  onOpenReasoning,
}) => {
  const handleReasoningClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenReasoning();
  };

  return (
    <div className={`candidate-card ${isTopChoice ? 'selected' : ''}`}>
      {isTopChoice && (
        <span className="candidate-selected-badge">Highest score</span>
      )}
      <div className="candidate-header" style={{ gap: 12 }}>
        <div className="candidate-info">
          <div className="candidate-display">
            <h4 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h4>
            {candidate.party && (
              <span className="candidate-party">({candidate.party})</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small ghost"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label={`Edit ${candidate.name || 'candidate'}`}
          >
            ✎ Edit
          </button>
          <button
            className="btn small ghost danger"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label={`Remove ${candidate.name || 'candidate'}`}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="candidate-details">
        <div style={{ marginBottom: 12 }}>
          <label className="muted" style={{ display: 'block', marginBottom: 4 }}>STAR score (0–5)</label>
          <Stars value={score} onChange={onScoreChange} />
        </div>
        {candidate.description && (
          <p className="candidate-description">{candidate.description}</p>
        )}
        {candidate.website && (
          <a 
            href={candidate.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="candidate-website"
          >
            Website
          </a>
        )}
      </div>

      <div className="candidate-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>Score: {score}/5</span>
        <button className="btn small" onClick={handleReasoningClick}>
          Link reasoning
        </button>
      </div>
    </div>
  );
};
