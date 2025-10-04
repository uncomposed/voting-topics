import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { CandidateCard } from './CandidateCard';
import { CandidateModal } from './CandidateModal';
import { OfficeModal } from './OfficeModal';
import { ReasoningLinker } from './ReasoningLinker';

export const OfficeSelector: React.FC = () => {
  const { 
    currentBallot, 
    addOffice, 
    removeOffice, 
    addCandidate,
    removeCandidate,
    setCandidateScore
  } = useStore();

  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOfficeTitle, setNewOfficeTitle] = useState('');
  const [newOfficeDescription, setNewOfficeDescription] = useState('');
  const [editing, setEditing] = useState<{ officeId: string; candidateId: string } | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [reasoningFocus, setReasoningFocus] = useState<{ officeId: string; candidateId: string } | null>(null);

  useEffect(() => {
    if (!currentBallot || !reasoningFocus) return;
    const office = currentBallot.offices.find(o => o.id === reasoningFocus.officeId);
    const candidateStillExists = office?.candidates.some(c => c.id === reasoningFocus.candidateId);
    if (!candidateStillExists) {
      setReasoningFocus(null);
    }
  }, [currentBallot, reasoningFocus]);

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

  const handleScoreChange = (officeId: string, candidateId: string, value: number) => {
    setCandidateScore(officeId, candidateId, value);
  };

  const toggleReasoningPanel = (officeId: string, candidateId: string) => {
    setReasoningFocus(prev => (
      prev && prev.officeId === officeId && prev.candidateId === candidateId
        ? null
        : { officeId, candidateId }
    ));
  };

  return (
    <div className="office-selector">
      <div className="office-selector-header">
        <div className="header-content">
          <div>
            <h2>Offices & Candidates</h2>
            <p>Add offices and score each candidate 0–5 using STAR voting.</p>
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
                  onClick={() => setEditingOfficeId(office.id)}
                  className="btn small ghost"
                >
                  Edit Office
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
                    candidate={candidate}
                    score={candidate.score ?? 0}
                    isTopChoice={office.selectedCandidateId === candidate.id}
                    onScoreChange={(value) => handleScoreChange(office.id, candidate.id, value)}
                    onRemove={() => removeCandidate(office.id, candidate.id)}
                    onEdit={() => setEditing({ officeId: office.id, candidateId: candidate.id })}
                    onOpenReasoning={() => toggleReasoningPanel(office.id, candidate.id)}
                  />
                ))
              )}
            </div>
            {reasoningFocus?.officeId === office.id && (
              <div className="reasoning-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Reasoning</h4>
                  <button className="btn small ghost" onClick={() => setReasoningFocus(null)}>Close</button>
                </div>
                <ReasoningLinker 
                  officeId={office.id}
                  candidateId={reasoningFocus.candidateId}
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

      {editingOfficeId && (() => {
        const off = currentBallot.offices.find(o => o.id === editingOfficeId);
        if (!off) return null;
        return (
          <OfficeModal
            office={off}
            isOpen={true}
            onClose={() => setEditingOfficeId(null)}
          />
        );
      })()}
    </div>
  );
};
