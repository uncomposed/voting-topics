import React, { useState, useRef } from 'react';
import { Topic } from '../schema';

interface TopicCardsProps {
  topics: Topic[];
  onReorder: (topicId: string, newImportance: number) => void;
  onTopicClick: (topic: Topic) => void;
}

interface DragState {
  isDragging: boolean;
  draggedTopic: Topic | null;
  draggedOverImportance: number | null;
}

export const TopicCards: React.FC<TopicCardsProps> = ({ topics, onReorder, onTopicClick }) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTopic: null,
    draggedOverImportance: null
  });
  const [isExpanded, setIsExpanded] = useState(true);
  
  const dragRef = useRef<HTMLDivElement>(null);

  // Group topics by importance (5 to 0)
  const groupedTopics = Array.from({ length: 6 }, (_, i) => 5 - i).map(importance => ({
    importance,
    topics: topics.filter(t => t.importance === importance)
  }));

  const handleDragStart = (e: React.DragEvent, topic: Topic) => {
    setDragState({
      isDragging: true,
      draggedTopic: topic,
      draggedOverImportance: null
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', topic.id);
  };

  const handleDragOver = (e: React.DragEvent, importance: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, draggedOverImportance: importance }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, draggedOverImportance: null }));
  };

  const handleDrop = (e: React.DragEvent, targetImportance: number) => {
    e.preventDefault();
    if (dragState.draggedTopic && dragState.draggedTopic.importance !== targetImportance) {
      onReorder(dragState.draggedTopic.id, targetImportance);
    }
    setDragState({
      isDragging: false,
      draggedTopic: null,
      draggedOverImportance: null
    });
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedTopic: null,
      draggedOverImportance: null
    });
  };

  const getImportanceLabel = (importance: number): string => {
    if (importance === 0) return 'Unrated';
    if (importance === 1) return 'Low Priority';
    if (importance === 2) return 'Medium Priority';
    if (importance === 3) return 'High Priority';
    if (importance === 4) return 'Very High Priority';
    return 'Critical Priority';
  };

  const getDirectionText = (topic: Topic): string => {
    if (topic.mode === 'scale') {
      const labels = ['Strongly Against', 'Lean Against', 'Neutral', 'Lean For', 'Strongly For'];
      return labels[(topic.direction.scale ?? 0) + 2];
    }
    return topic.direction.custom || 'Custom';
  };

  return (
    <div className="topic-cards" ref={dragRef}>
      <div className="cards-header">
        <h2>Topic Priority View</h2>
        <div className="cards-controls">
          <button 
            className={`btn ghost ${isExpanded ? 'active' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Switch to minimal view' : 'Switch to expanded view'}
          >
            {isExpanded ? '📖' : '📝'} {isExpanded ? 'Minimal' : 'Expanded'}
          </button>
        </div>
        <p className="muted">Drag cards to reorder by importance. Click to edit details.</p>
      </div>
      
      <div className="cards-grid">
        {groupedTopics.map(({ importance, topics }) => (
          <div
            key={importance}
            className={`importance-column ${dragState.draggedOverImportance === importance ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, importance)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, importance)}
          >
            <div className="importance-header">
              <div className="importance-stars">
                {Array.from({ length: 6 }, (_, n) => (
                  <span key={n} className={`star ${n <= importance ? 'filled' : ''}`}>
                    {n === 0 ? '–' : (n <= importance ? '★' : '☆')}
                  </span>
                ))}
              </div>
              <h3>{getImportanceLabel(importance)}</h3>
              <span className="topic-count">{topics.length} topic{topics.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="topic-cards-container">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`topic-card ${dragState.draggedTopic?.id === topic.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, topic)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTopicClick(topic)}
                >
                  <div className="card-header">
                    <h4 className="card-title">{topic.title || 'Untitled Topic'}</h4>
                    <div className="card-direction">
                      {topic.mode === 'scale' ? (
                        <span className={`direction-badge scale-${topic.direction.scale ?? 0}`}>
                          {getDirectionText(topic)}
                        </span>
                      ) : (
                        <span className={`direction-badge custom`}>
                          {topic.direction.custom || 'Custom'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && topic.notes && (
                    <p className="card-notes">{topic.notes}</p>
                  )}
                  
                  {isExpanded && topic.sources && topic.sources.length > 0 && (
                    <div className="card-sources">
                      <small className="muted">
                        {topic.sources.length} source{topic.sources.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                  )}
                  
                  <div className="card-footer">
                    <span className="card-id">ID: {topic.id}</span>
                    <span className="drag-hint">Drag to reorder • Click to edit</span>
                  </div>
                </div>
              ))}
              
              {topics.length === 0 && (
                <div className="empty-column">
                  <p className="muted">Drop topics here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
