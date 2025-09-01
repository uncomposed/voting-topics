import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { TopicCard } from './TopicCard';
import type { Topic } from '../schema';

interface TopicListProps {
  topics: Topic[];
  onChange: (id: string, patch: Partial<Topic>) => void;
  onDelete: (id: string) => void;
}

export const TopicList = forwardRef<{ toggleAll: () => void; updateButtonText: () => void }, TopicListProps>(({ topics, onChange, onDelete }, ref) => {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(topics.map(t => t.id)));
  const [allExpanded, setAllExpanded] = useState(true);

  if (topics.length === 0) {
    return (
      <div className="empty">
        No topics yet. Click <b>New Topic</b> to get started.
      </div>
    );
  }

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
    </div>
  );
});
