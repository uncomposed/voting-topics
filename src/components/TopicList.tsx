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

  useImperativeHandle(ref, () => ({
    toggleAll,
    updateButtonText: () => {
      const btnExpandAll = document.getElementById('btn-expand-all');
      if (btnExpandAll) {
        btnExpandAll.textContent = allExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }));

  // Update button text when component mounts or state changes
  useEffect(() => {
    const btnExpandAll = document.getElementById('btn-expand-all');
    if (btnExpandAll) {
      btnExpandAll.textContent = allExpanded ? '▼ Collapse All' : '▶ Expand All';
    }
  }, [allExpanded]);

  return (
    <div className="list">
      <div className="list-controls">
        <span className="muted">
          {expandedTopics.size} of {topics.length} topics expanded
        </span>
      </div>
      
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
