import React, { useEffect } from 'react';
import { TopicCard } from './TopicCard';
import type { Topic } from '../schema';

interface TopicListProps {
  topics: Topic[];
  onChange: (id: string, patch: Partial<Topic>) => void;
  onDelete: (id: string) => void;
}

export const TopicList: React.FC<TopicListProps> = ({ topics, onChange, onDelete }) => {
  useEffect(() => {
    const has = topics.length > 0;
    const emptyEl = document.getElementById('empty');
    const topicListEl = document.getElementById('topic-list');
    
    if (emptyEl) emptyEl.hidden = has;
    if (topicListEl) topicListEl.hidden = !has;
  }, [topics.length]);

  return (
    <div>
      <div id="topic-list" className="list">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onChange={(patch) => onChange(topic.id, { ...topic, ...patch })}
            onDelete={() => onDelete(topic.id)}
          />
        ))}
      </div>
      <div id="empty" className="empty">
        No topics yet. Click <b>New Topic</b> to get started.
      </div>
    </div>
  );
};
