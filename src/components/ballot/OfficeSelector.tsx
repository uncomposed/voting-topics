import React, { useState } from 'react';
import { useStore } from '../../store';
import { CandidateCard } from './CandidateCard';
import { CandidateModal } from './CandidateModal';
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
  const [editing, setEditing] = useState<{ officeId: string; candidateId: string } | null>(null);

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
    const before = new Set((useStore.getState().currentBallot?.offices.find(o => o.id === officeId)?.candidates || []).map(c => c.id));
    addCandidate(officeId, {
      name: '',
      party: undefined,
      description: undefined,
      website: undefined,
      sources: []
    });
    setTimeout(() => {
      const off = useStore.getState().currentBallot?.offices.find(o => o.id === officeId);
      const newCand = off?.candidates.find(c => !before.has(c.id));
      if (newCand) setEditing({ officeId, candidateId: newCand.id });
    }, 0);
  };

  const handleSelectCandidate = (officeId: string, candidateId: string) => {
    selectCandidate(officeId, candidateId);
  };

  return (
    <div className="office-selector">
      <div className="office-selector-header">
        <div className="header-content">
          <div>
            <h2>Offices & Candidates</h2>
            <p>Add offices and candidates for this election</p>
          </div>
          <button 
            onClick={() => setShowAddOffice(true)}
            className="btn primary"
          >
            + Add Office
          </button>
        </div>
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
                    onEdit={() => setEditing({ officeId: office.id, candidateId: candidate.id })}
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

      {editing && (() => {
        const off = currentBallot.offices.find(o => o.id === editing.officeId);
        const cand = off?.candidates.find(c => c.id === editing.candidateId);
        if (!off || !cand) return null;
        return (
          <CandidateModal
            officeId={off.id}
            candidate={cand}
            isOpen={true}
            onClose={() => setEditing(null)}
          />
        );
      })()}
    </div>
  );
};
