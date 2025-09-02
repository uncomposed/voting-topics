import React, { useState } from 'react';
import { useStore } from '../../store';
import { CandidateCard } from './CandidateCard';
import { ReasoningLinker } from './ReasoningLinker';

export const OfficeSelector: React.FC = () => {
  const { 
    currentBallot, 
    addOffice, 
    removeOffice, 
    addCandidate,
    removeCandidate,
    selectCandidate
  } = useStore();
  
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOfficeTitle, setNewOfficeTitle] = useState('');
  const [newOfficeDescription, setNewOfficeDescription] = useState('');

  if (!currentBallot) {
    return <div>No ballot found</div>;
  }

  const handleAddOffice = () => {
    if (newOfficeTitle.trim()) {
      addOffice({
        title: newOfficeTitle.trim(),
        description: newOfficeDescription.trim() || undefined,
        candidates: [],
        selectedCandidateId: undefined,
        reasoning: []
      });
      setNewOfficeTitle('');
      setNewOfficeDescription('');
      setShowAddOffice(false);
    }
  };

  const handleAddCandidate = (officeId: string) => {
    addCandidate(officeId, {
      name: '',
      party: undefined,
      description: undefined,
      website: undefined,
      sources: []
    });
  };

  const handleSelectCandidate = (officeId: string, candidateId: string) => {
    selectCandidate(officeId, candidateId);
  };

  return (
    <div className="office-selector">
      <div className="office-selector-header">
        <h2>Offices & Candidates</h2>
        <p>Add offices and candidates for this election</p>
        
        <button 
          onClick={() => setShowAddOffice(true)}
          className="btn primary"
        >
          + Add Office
        </button>
      </div>

      {showAddOffice && (
        <div className="add-office-form">
          <h3>Add New Office</h3>
          <div className="form-group">
            <label htmlFor="office-title">Office Title *</label>
            <input
              id="office-title"
              type="text"
              value={newOfficeTitle}
              onChange={(e) => setNewOfficeTitle(e.target.value)}
              placeholder="e.g., Mayor, City Council District 1, Governor"
            />
          </div>
          <div className="form-group">
            <label htmlFor="office-description">Description (optional)</label>
            <textarea
              id="office-description"
              value={newOfficeDescription}
              onChange={(e) => setNewOfficeDescription(e.target.value)}
              placeholder="Brief description of the office and its responsibilities"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button onClick={handleAddOffice} className="btn primary">
              Add Office
            </button>
            <button 
              onClick={() => setShowAddOffice(false)}
              className="btn ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="offices-list">
        {currentBallot.offices.map((office) => (
          <div key={office.id} className="office-card">
            <div className="office-header">
              <h3>{office.title}</h3>
              {office.description && (
                <p className="office-description">{office.description}</p>
              )}
              <div className="office-actions">
                <button 
                  onClick={() => handleAddCandidate(office.id)}
                  className="btn small"
                >
                  + Add Candidate
                </button>
                <button 
                  onClick={() => removeOffice(office.id)}
                  className="btn small danger"
                >
                  Remove Office
                </button>
              </div>
            </div>

            <div className="candidates-list">
              {office.candidates.length === 0 ? (
                <div className="no-candidates">
                  <p>No candidates added yet. Click "Add Candidate" to get started.</p>
                </div>
              ) : (
                office.candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    office={office}
                    candidate={candidate}
                    isSelected={office.selectedCandidateId === candidate.id}
                    onSelect={() => handleSelectCandidate(office.id, candidate.id)}
                    onRemove={() => removeCandidate(office.id, candidate.id)}
                  />
                ))
              )}
            </div>

            {office.selectedCandidateId && (
              <div className="reasoning-section">
                <h4>Reasoning for Selection</h4>
                <ReasoningLinker 
                  officeId={office.id}
                  candidateId={office.selectedCandidateId}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {currentBallot.offices.length === 0 && (
        <div className="no-offices">
          <p>No offices added yet. Click "Add Office" to get started.</p>
        </div>
      )}
    </div>
  );
};
