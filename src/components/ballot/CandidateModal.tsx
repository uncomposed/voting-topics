import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { Candidate } from '../../schema';

interface Props {
  officeId: string;
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
}

export const CandidateModal: React.FC<Props> = ({ officeId, candidate, isOpen, onClose }) => {
  const updateCandidate = useStore(s => s.updateCandidate);
  const removeCandidate = useStore(s => s.removeCandidate);
  const [name, setName] = useState(candidate.name);
  const [party, setParty] = useState(candidate.party || '');
  const [description, setDescription] = useState(candidate.description || '');
  const [website, setWebsite] = useState(candidate.website || '');

  useEffect(() => {
    setName(candidate.name);
    setParty(candidate.party || '');
    setDescription(candidate.description || '');
    setWebsite(candidate.website || '');
  }, [candidate.id]);

  if (!isOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="panel-title">Edit Candidate</h3>
          <button className="btn ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Candidate name" />
          </div>
          <div className="form-group">
            <label>Party (optional)</label>
            <input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Party affiliation" />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={3} />
          </div>
          <div className="form-group">
            <label>Website (optional)</label>
            <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn danger" onClick={() => { removeCandidate(officeId, candidate.id); onClose(); }}>Remove</button>
          <button
            className="btn primary"
            onClick={() => {
              updateCandidate(officeId, candidate.id, {
                name: name.trim() || candidate.name,
                party: party.trim() || undefined,
                description: description.trim() || undefined,
                website: website.trim() || undefined,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

