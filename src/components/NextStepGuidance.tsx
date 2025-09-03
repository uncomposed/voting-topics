import React from 'react';
import { useStore } from '../store';

export const NextStepGuidance: React.FC = () => {
  const topics = useStore(state => state.topics);
  const ballotMode = useStore(state => state.ballotMode);
  const currentFlowStep = useStore(state => state.currentFlowStep);
  
  // Determine current step and next step based on flow state
  const getCurrentStep = () => {
    // Use flow state if available, otherwise fall back to topic-based logic
    if (currentFlowStep) {
      switch (currentFlowStep) {
        case 'starter':
          return {
            current: "Getting Started",
            next: "Select topics from the starter pack below",
            action: "starter-pack"
          };
        case 'cards':
          return {
            current: "Sorting Priorities",
            next: "Drag topics between priority levels to organize them",
            action: "sort-priorities"
          };
        case 'list':
          return {
            current: "Adding Details",
            next: "Add specific directions and details for each topic",
            action: "add-details"
          };
        case 'complete':
          return {
            current: "Preference Set Complete",
            next: "Export your preferences or create a sample ballot",
            action: "export-or-ballot"
          };
      }
    }
    
    // Fallback to original logic for backward compatibility
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
            👆 Use the starter pack below to get started quickly
          </div>
        );
      case "sort-priorities":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Drag topics between columns to set their priority levels
          </div>
        );
      case "add-details":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Click on topics to add specific directions and details
          </div>
        );
      case "export-or-ballot":
        return (
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            👆 Use the buttons below to export or create a ballot
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
      
      {/* LLM Integration Hint */}
      <div style={{ 
        marginTop: '12px', 
        padding: '8px 12px', 
        background: 'rgba(155, 130, 255, 0.1)', 
        border: '1px solid rgba(155, 130, 255, 0.3)', 
        borderRadius: '6px',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '1rem' }}>🤖</span>
          <span style={{ fontWeight: '600', color: 'var(--focus)' }}>
            Pro Tip: Use with AI
          </span>
        </div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>
          Export your data and ask your language model to help generate topics, refine directions, or create sample ballots. 
          <button 
            className="btn ghost" 
            style={{ 
              fontSize: '0.8rem', 
              padding: '2px 6px', 
              marginLeft: '6px',
              textDecoration: 'underline'
            }}
            onClick={() => {
              // This will be handled by the App component
              const llmBtn = document.getElementById('btn-llm-integration');
              if (llmBtn) llmBtn.click();
            }}
          >
            Try LLM Integration →
          </button>
        </div>
      </div>
    </div>
  );
};
