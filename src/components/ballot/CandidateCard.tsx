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
    <div className={`candidate-card ${isSelected ? 'selected' : ''}`}>
      <div className="candidate-header" style={{ gap: 12 }}>
        <div className="candidate-info">
          <div className="candidate-display">
            <h4 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h4>
            {candidate.party && (
              <span className="candidate-party">({candidate.party})</span>
            )}
          </div>
        </div>
        
        <div className="candidate-actions">
          <>
            <button 
              onClick={onSelect}
              className={`btn small ${isSelected ? 'selected' : 'primary'}`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
            <button 
              onClick={onEdit}
              className="btn small ghost"
            >
              Edit
            </button>
            <button 
              onClick={onRemove}
              className="btn small danger"
            >
              Remove
            </button>
          </>
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
