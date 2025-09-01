import React from 'react';
import { TopicCard } from './TopicCard';
import type { Topic } from '../schema';

interface TopicListProps {
  topics: Topic[];
  onChange: (id: string, patch: Partial<Topic>) => void;
  onDelete: (id: string) => void;
}

export const TopicList: React.FC<TopicListProps> = ({ topics, onChange, onDelete }) => {
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
        />
      ))}
    </div>
  );
};
