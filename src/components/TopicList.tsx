import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TopicCard } from './TopicCard';
import type { Topic } from '../schema';
import { useStore } from '../store';
import { toast } from '../utils/toast';

interface TopicListProps {
  topics: Topic[];
  onChange: (id: string, patch: Partial<Topic>) => void;
  onDelete: (id: string) => void;
}

export const TopicList = forwardRef<{ toggleAll: () => void; updateButtonText: () => void }, TopicListProps>(({ topics, onChange, onDelete }, ref) => {
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const advanceFlowStep = useStore(state => state.advanceFlowStep);
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

  // Expand/Collapse all button is now controlled from the Toolbar; expose methods via ref

  useImperativeHandle(ref, () => ({
    toggleAll,
    updateButtonText: () => {
      const btnExpandAll = document.getElementById('btn-expand-all');
      if (btnExpandAll) {
        btnExpandAll.textContent = allExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }));

  // Keep newly added topics expanded by default and prune removed ids
  useEffect(() => {
    const currentIds = new Set(topics.map(t => t.id));
    setExpandedTopics(prev => {
      // Keep previously expanded items that still exist
      const next = new Set<string>(Array.from(prev).filter(id => currentIds.has(id)));
      // Expand any new items by default
      for (const id of currentIds) {
        if (!prev.has(id)) next.add(id);
      }
      setAllExpanded(next.size === topics.length);
      return next;
    });
  }, [topics]);

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
          onDelete={() => {
            // Capture snapshot and index for undo
            const idx = topics.findIndex(t => t.id === topic.id);
            const snapshot = topics.find(t => t.id === topic.id);
            onDelete(topic.id);
            if (snapshot && idx >= 0) {
              toast.show({
                variant: 'warn',
                title: 'Topic deleted',
                message: snapshot.title ? `"${snapshot.title}" was removed` : 'A topic was removed',
                actionLabel: 'Undo',
                onAction: () => {
                  useStore.setState(s => ({
                    topics: [
                      ...s.topics.slice(0, idx),
                      snapshot,
                      ...s.topics.slice(idx)
                    ]
                  }));
                },
                duration: 6000,
              });
            }
          }}
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
                advanceFlowStep();
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
                advanceFlowStep();
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
