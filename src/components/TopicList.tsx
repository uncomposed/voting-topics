import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { TopicCard } from './TopicCard';
import type { Topic } from '../schema';
import { useStore } from '../store';

interface TopicListProps {
  topics: Topic[];
  onChange: (id: string, patch: Partial<Topic>) => void;
  onDelete: (id: string) => void;
}

export const TopicList = forwardRef<{ toggleAll: () => void; updateButtonText: () => void }, TopicListProps>(({ topics, onChange, onDelete }, ref) => {
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const setCurrentFlowStep = useStore(state => state.setCurrentFlowStep);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(topics.map(t => t.id)));
  const [allExpanded, setAllExpanded] = useState(true);

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
    setAllExpanded(newExpanded.size === topics.length);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedTopics(new Set());
      setAllExpanded(false);
    } else {
      setExpandedTopics(new Set(topics.map(t => t.id)));
      setAllExpanded(true);
    }
  };

  // Wire up the main button directly
  useEffect(() => {
    const btnExpandAll = document.getElementById('btn-expand-all');
    if (btnExpandAll) {
      // Remove any existing click handlers
      btnExpandAll.replaceWith(btnExpandAll.cloneNode(true));
      
      // Get the fresh reference
      const freshBtn = document.getElementById('btn-expand-all');
      if (freshBtn) {
        freshBtn.onclick = () => {
          console.log('Main button clicked in list view! Current state:', allExpanded);
          toggleAll();
        };
        
        // Set initial button text
        freshBtn.textContent = allExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }, [allExpanded]);

  useImperativeHandle(ref, () => ({
    toggleAll,
    updateButtonText: () => {
      const btnExpandAll = document.getElementById('btn-expand-all');
      if (btnExpandAll) {
        btnExpandAll.textContent = allExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }));

  // Early return after all hooks
  if (topics.length === 0) {
    return (
      <div className="empty">
        No topics yet. Click <b>New Topic</b> to get started.
      </div>
    );
  }

  return (
    <div className="list">
      {topics.map(topic => (
        <TopicCard
          key={topic.id}
          topic={topic}
          onChange={(patch) => onChange(topic.id, patch)}
          onDelete={() => onDelete(topic.id)}
          isExpanded={expandedTopics.has(topic.id)}
          onToggleExpand={() => toggleTopic(topic.id)}
        />
      ))}
      
      {/* Next Button - only show when in list flow step */}
      {currentFlowStep === 'list' && topics.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 24, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="btn" 
              onClick={() => {
                setCurrentFlowStep('complete');
                // Trigger export functionality
                const exportBtn = document.getElementById('btn-export');
                if (exportBtn) exportBtn.click();
              }}
              style={{ 
                fontSize: '1rem', 
                padding: '12px 24px',
                fontWeight: '600',
                background: 'var(--accent)',
                color: 'var(--bg)',
                border: 'none'
              }}
            >
              📤 Export Preference Set
            </button>
            <button 
              className="btn" 
              onClick={() => {
                setCurrentFlowStep('complete');
                // Trigger ballot creation
                const ballotBtn = document.getElementById('btn-ballot-mode');
                if (ballotBtn) ballotBtn.click();
              }}
              style={{ 
                fontSize: '1rem', 
                padding: '12px 24px',
                fontWeight: '600',
                background: 'var(--accent-2)',
                color: 'var(--bg)',
                border: 'none'
              }}
            >
              🗳️ Create Sample Ballot
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
