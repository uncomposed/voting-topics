import React from 'react';
import { useStore } from '../store';

export const NextStepGuidance: React.FC = () => {
  const topics = useStore(state => state.topics);
  const ballotMode = useStore(state => state.ballotMode);
  
  // Determine current step and next step
  const getCurrentStep = () => {
    if (topics.length === 0) {
      return {
        current: "Getting Started",
        next: "Add topics from starter pack or create your own",
        action: "starter-pack"
      };
    }
    
    const hasUnratedDirections = topics.some(topic => 
      topic.directions.some(dir => dir.stars === 0)
    );
    
    if (hasUnratedDirections) {
      return {
        current: "Adding Topics",
        next: "Rate the importance of each direction (0-5 stars)",
        action: "rate-directions"
      };
    }
    
    const hasEmptyTopics = topics.some(topic => 
      topic.directions.length === 0
    );
    
    if (hasEmptyTopics) {
      return {
        current: "Rating Directions",
        next: "Add specific directions for each topic",
        action: "add-directions"
      };
    }
    
    if (ballotMode === 'preference') {
      return {
        current: "Preference Set Complete",
        next: "Create a sample ballot or export your preferences",
        action: "create-ballot"
      };
    }
    
    return {
      current: "Ballot Builder",
      next: "Add offices, candidates, and measures to your ballot",
      action: "build-ballot"
    };
  };
  
  const step = getCurrentStep();
  
  const getActionButton = () => {
    switch (step.action) {
      case "starter-pack":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Use the starter pack above to get started quickly
          </div>
        );
      case "rate-directions":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Click on topics to expand and rate each direction
          </div>
        );
      case "add-directions":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Add specific directions for topics that need them
          </div>
        );
      case "create-ballot":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Use the "Create Ballot" button in the toolbar
          </div>
        );
      case "build-ballot":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Add offices and candidates to build your ballot
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="next-step-guidance" style={{
      background: 'linear-gradient(135deg, rgba(139, 211, 255, 0.1) 0%, rgba(100, 255, 161, 0.05) 100%)',
      border: '1px solid rgba(139, 211, 255, 0.3)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '1.1rem' }}>🎯</span>
        <span style={{ fontWeight: '600', color: 'var(--accent)' }}>
          {step.current}
        </span>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <strong>Next:</strong> {step.next}
      </div>
      {getActionButton()}
    </div>
  );
};
