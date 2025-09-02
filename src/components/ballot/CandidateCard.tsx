import React, { useState } from 'react';
import { useStore } from '../../store';
import type { Office, Candidate } from '../../schema';

interface CandidateCardProps {
  office: Office;
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  office,
  candidate,
  isSelected,
  onSelect,
  onRemove
}) => {
  const { updateCandidate } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: candidate.name,
    party: candidate.party || '',
    description: candidate.description || '',
    website: candidate.website || ''
  });

  const handleSave = () => {
    updateCandidate(office.id, candidate.id, {
      name: editData.name.trim(),
      party: editData.party.trim() || undefined,
      description: editData.description.trim() || undefined,
      website: editData.website.trim() || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: candidate.name,
      party: candidate.party || '',
      description: candidate.description || '',
      website: candidate.website || ''
    });
    setIsEditing(false);
  };

  return (
    <div className={`candidate-card ${isSelected ? 'selected' : ''}`}>
      <div className="candidate-header">
        <div className="candidate-info">
          {isEditing ? (
            <div className="candidate-edit-form">
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="candidate-name-input"
                placeholder="Candidate name"
              />
              <input
                type="text"
                value={editData.party}
                onChange={(e) => setEditData(prev => ({ ...prev, party: e.target.value }))}
                className="candidate-party-input"
                placeholder="Party affiliation (optional)"
              />
            </div>
          ) : (
            <div className="candidate-display">
              <h4 className="candidate-name">{candidate.name}</h4>
              {candidate.party && (
                <span className="candidate-party">({candidate.party})</span>
              )}
            </div>
          )}
        </div>
        
        <div className="candidate-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn small primary">
                Save
              </button>
              <button onClick={handleCancel} className="btn small ghost">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onSelect}
                className={`btn small ${isSelected ? 'selected' : 'primary'}`}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
              <button 
                onClick={() => setIsEditing(true)}
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
          )}
        </div>
      </div>

      {!isEditing && (
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
      )}

      {isEditing && (
        <div className="candidate-edit-details">
          <textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            className="candidate-description-input"
            placeholder="Brief description of the candidate (optional)"
            rows={3}
          />
          <input
            type="url"
            value={editData.website}
            onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
            className="candidate-website-input"
            placeholder="Website URL (optional)"
          />
        </div>
      )}
    </div>
  );
};
