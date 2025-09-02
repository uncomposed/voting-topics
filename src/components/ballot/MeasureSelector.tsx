import React, { useState } from 'react';
import { useStore } from '../../store';

export const MeasureSelector: React.FC = () => {
  const { 
    currentBallot, 
    addMeasure, 
    removeMeasure, 
    updateMeasure
  } = useStore();
  
  const [showAddMeasure, setShowAddMeasure] = useState(false);
  const [newMeasure, setNewMeasure] = useState({
    title: '',
    description: '',
    position: undefined as 'yes' | 'no' | 'abstain' | undefined
  });

  if (!currentBallot) {
    return <div>No ballot found</div>;
  }

  const handleAddMeasure = () => {
    if (newMeasure.title.trim()) {
      addMeasure({
        title: newMeasure.title.trim(),
        description: newMeasure.description.trim() || undefined,
        position: newMeasure.position,
        reasoning: [],
        sources: []
      });
      setNewMeasure({
        title: '',
        description: '',
        position: undefined
      });
      setShowAddMeasure(false);
    }
  };

  const handlePositionChange = (measureId: string, position: 'yes' | 'no' | 'abstain') => {
    updateMeasure(measureId, { position });
  };

  return (
    <div className="measure-selector">
      <div className="measure-selector-header">
        <h2>Ballot Measures</h2>
        <p>Add ballot measures and propositions for this election</p>
        
        <button 
          onClick={() => setShowAddMeasure(true)}
          className="btn primary"
        >
          + Add Measure
        </button>
      </div>

      {showAddMeasure && (
        <div className="add-measure-form">
          <h3>Add New Measure</h3>
          <div className="form-group">
            <label htmlFor="measure-title">Measure Title *</label>
            <input
              id="measure-title"
              type="text"
              value={newMeasure.title}
              onChange={(e) => setNewMeasure(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Measure 110, Proposition 1, Charter Amendment A"
            />
          </div>
          <div className="form-group">
            <label htmlFor="measure-description">Description (optional)</label>
            <textarea
              id="measure-description"
              value={newMeasure.description}
              onChange={(e) => setNewMeasure(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this measure does"
              rows={4}
            />
          </div>
          <div className="form-actions">
            <button onClick={handleAddMeasure} className="btn primary">
              Add Measure
            </button>
            <button 
              onClick={() => setShowAddMeasure(false)}
              className="btn ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="measures-list">
        {currentBallot.measures.map((measure) => (
          <div key={measure.id} className="measure-card">
            <div className="measure-header">
              <h3>{measure.title}</h3>
              <button 
                onClick={() => removeMeasure(measure.id)}
                className="btn small danger"
              >
                Remove
              </button>
            </div>
            
            {measure.description && (
              <p className="measure-description">{measure.description}</p>
            )}

            <div className="measure-position">
              <h4>Your Position:</h4>
              <div className="position-options">
                <label className={`position-option ${measure.position === 'yes' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`measure-${measure.id}`}
                    value="yes"
                    checked={measure.position === 'yes'}
                    onChange={() => handlePositionChange(measure.id, 'yes')}
                  />
                  <span>Yes</span>
                </label>
                <label className={`position-option ${measure.position === 'no' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`measure-${measure.id}`}
                    value="no"
                    checked={measure.position === 'no'}
                    onChange={() => handlePositionChange(measure.id, 'no')}
                  />
                  <span>No</span>
                </label>
                <label className={`position-option ${measure.position === 'abstain' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`measure-${measure.id}`}
                    value="abstain"
                    checked={measure.position === 'abstain'}
                    onChange={() => handlePositionChange(measure.id, 'abstain')}
                  />
                  <span>Abstain</span>
                </label>
              </div>
            </div>

            {measure.position && (
              <div className="measure-reasoning">
                <h4>Reasoning for {measure.position.toUpperCase()}</h4>
                <p className="no-reasoning">Reasoning links to preference topics coming soon.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {currentBallot.measures.length === 0 && (
        <div className="no-measures">
          <p>No measures added yet. Click "Add Measure" to get started.</p>
        </div>
      )}
    </div>
  );
};
