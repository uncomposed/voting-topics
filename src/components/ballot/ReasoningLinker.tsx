import React, { useState } from 'react';
import { useStore } from '../../store';
import type { ReasoningLink } from '../../schema';

interface ReasoningLinkerProps {
  officeId: string;
  candidateId: string;
}

export const ReasoningLinker: React.FC<ReasoningLinkerProps> = ({
  officeId,
  candidateId
}) => {
  const { topics, currentBallot, addReasoningLink, removeReasoningLink } = useStore();
  const [showAddReasoning, setShowAddReasoning] = useState(false);
  const [newReasoning, setNewReasoning] = useState({
    type: 'topic' as 'topic' | 'direction',
    topicId: '',
    directionId: '',
    relevance: '',
    weight: 3
  });

  if (!currentBallot) {
    return <div>No ballot found</div>;
  }

  const office = currentBallot.offices.find(o => o.id === officeId);
  if (!office) {
    return <div>Office not found</div>;
  }

  const candidate = office.candidates.find(c => c.id === candidateId);
  if (!candidate) {
    return <div>Candidate not found</div>;
  }

  const selectedTopic = topics.find(t => t.id === newReasoning.topicId);

  const handleAddReasoning = () => {
    if (newReasoning.topicId && newReasoning.relevance.trim()) {
      const reasoning: ReasoningLink = {
        type: newReasoning.type,
        topicId: newReasoning.topicId,
        directionId: newReasoning.type === 'direction' ? newReasoning.directionId : undefined,
        relevance: newReasoning.relevance.trim(),
        weight: newReasoning.weight
      };
      
      addReasoningLink(officeId, candidateId, reasoning);
      
      setNewReasoning({
        type: 'topic',
        topicId: '',
        directionId: '',
        relevance: '',
        weight: 3
      });
      setShowAddReasoning(false);
    }
  };

  const handleRemoveReasoning = (reasoningId: string) => {
    removeReasoningLink(officeId, candidateId, reasoningId);
  };

  const getReasoningDisplayText = (reasoning: ReasoningLink): string => {
    const topic = topics.find(t => t.id === reasoning.topicId);
    if (!topic) return 'Unknown topic';
    
    if (reasoning.type === 'direction' && reasoning.directionId) {
      const direction = topic.directions.find(d => d.id === reasoning.directionId);
      return direction ? `${topic.title} → ${direction.text}` : topic.title;
    }
    
    return topic.title;
  };

  return (
    <div className="reasoning-linker">
      <div className="reasoning-header">
        <h4>Reasoning for {candidate.name}</h4>
        <button 
          onClick={() => setShowAddReasoning(true)}
          className="btn small primary"
        >
          + Add Reasoning
        </button>
      </div>

      {showAddReasoning && (
        <div className="add-reasoning-form">
          <h5>Add Reasoning Link</h5>
          
          <div className="form-group">
            <label>Link Type</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="topic"
                  checked={newReasoning.type === 'topic'}
                  onChange={(e) => setNewReasoning(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'topic',
                    directionId: ''
                  }))}
                />
                Topic
              </label>
              <label>
                <input
                  type="radio"
                  value="direction"
                  checked={newReasoning.type === 'direction'}
                  onChange={(e) => setNewReasoning(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'direction'
                  }))}
                />
                Specific Direction
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reasoning-topic">Topic *</label>
            <select
              id="reasoning-topic"
              value={newReasoning.topicId}
              onChange={(e) => setNewReasoning(prev => ({ 
                ...prev, 
                topicId: e.target.value,
                directionId: ''
              }))}
            >
              <option value="">Select a topic</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} ({topic.importance}/5 stars)
                </option>
              ))}
            </select>
          </div>

          {newReasoning.type === 'direction' && selectedTopic && (
            <div className="form-group">
              <label htmlFor="reasoning-direction">Direction *</label>
              <select
                id="reasoning-direction"
                value={newReasoning.directionId}
                onChange={(e) => setNewReasoning(prev => ({ 
                  ...prev, 
                  directionId: e.target.value
                }))}
              >
                <option value="">Select a direction</option>
                {selectedTopic.directions.map(direction => (
                  <option key={direction.id} value={direction.id}>
                    {direction.text} ({direction.stars}/5 stars)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reasoning-relevance">Relevance Explanation *</label>
            <textarea
              id="reasoning-relevance"
              value={newReasoning.relevance}
              onChange={(e) => setNewReasoning(prev => ({ 
                ...prev, 
                relevance: e.target.value
              }))}
              placeholder="Explain how this topic/direction relates to this candidate choice"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reasoning-weight">Importance Weight (1-5)</label>
            <input
              id="reasoning-weight"
              type="range"
              min="1"
              max="5"
              value={newReasoning.weight}
              onChange={(e) => setNewReasoning(prev => ({ 
                ...prev, 
                weight: parseInt(e.target.value)
              }))}
            />
            <span className="weight-display">{newReasoning.weight}/5</span>
          </div>

          <div className="form-actions">
            <button onClick={handleAddReasoning} className="btn small primary">
              Add Reasoning
            </button>
            <button 
              onClick={() => setShowAddReasoning(false)}
              className="btn small ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="reasoning-list">
        {office.reasoning.length === 0 ? (
          <p className="no-reasoning">No reasoning added yet. Add reasoning to explain your candidate choice.</p>
        ) : (
          office.reasoning.map((reasoning, index) => (
            <div key={index} className="reasoning-item">
              <div className="reasoning-content">
                <div className="reasoning-topic">
                  <strong>{getReasoningDisplayText(reasoning)}</strong>
                  <span className="reasoning-weight">({reasoning.weight}/5)</span>
                </div>
                <p className="reasoning-relevance">{reasoning.relevance}</p>
              </div>
              <button 
                onClick={() => handleRemoveReasoning(reasoning.topicId)}
                className="btn small danger"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
