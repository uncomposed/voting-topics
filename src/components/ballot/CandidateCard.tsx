import React from 'react';
import { useStore } from '../../store';
import type { Office, Candidate } from '../../schema';

interface CandidateCardProps {
  office: Office;
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  office,
  candidate,
  isSelected,
  onSelect,
  onRemove,
  onEdit
}) => {
  const updateCandidate = useStore(state => state.updateCandidate);

  return (
    <div className={`candidate-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      {isSelected && (
        <span className="candidate-selected-badge">✓ Selected</span>
      )}
      <button
        className="btn small ghost candidate-edit-btn"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        aria-label={`Edit ${candidate.name || 'candidate'}`}
      >
        ✎ Edit
      </button>

      <div className="candidate-header" style={{ gap: 12 }}>
        <div className="candidate-info">
          <div className="candidate-display">
            <h4 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h4>
            {candidate.party && (
              <span className="candidate-party">({candidate.party})</span>
            )}
          </div>
        </div>

      </div>

      <div className="candidate-details">
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
    </div>
  );
};
