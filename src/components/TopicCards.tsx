import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Topic } from '../schema';
import { SmartDirectionDots } from './SmartDirectionDots';
import { Stars } from './Stars';
import { useStore } from '../store';

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

export const TopicCards = forwardRef<{ toggleExpanded: () => void; updateButtonText: () => void }, TopicCardsProps>(({ topics, onReorder, onTopicClick }, ref) => {
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const setCurrentFlowStep = useStore(state => state.setCurrentFlowStep);
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


  useImperativeHandle(ref, () => ({
    toggleExpanded: () => {
      setIsExpanded(prev => {
        const newState = !prev;
        
        // Update button text after state change
        setTimeout(() => {
          const btnExpandAll = document.getElementById('btn-expand-all');
          if (btnExpandAll) {
            btnExpandAll.textContent = newState ? '▼ Collapse All' : '▶ Expand All';
          }
        }, 0);
        
        return newState;
      });
    },
    updateButtonText: () => {
      const btnExpandAll = document.getElementById('btn-expand-all');
      if (btnExpandAll) {
        btnExpandAll.textContent = isExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }));



  return (
    <div className="topic-cards" ref={dragRef}>
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
                <Stars 
                  value={importance} 
                  onChange={() => {}} 
                />
              </div>
              <h3>{getImportanceLabel(importance)}</h3>
              <span className="topic-count">{topics.length} topic{topics.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="topic-cards-container">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`topic-card ${dragState.draggedTopic?.id === topic.id ? 'dragging' : ''}`}
                  data-topic-id={topic.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, topic)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTopicClick(topic)}
                >
                  <div className="card-header">
                    <h4 className="card-title">{topic.title || 'Untitled Topic'}</h4>
                    <div className="card-directions">
                      <SmartDirectionDots directions={topic.directions} maxVisible={7} />
                    </div>
                  </div>
                  
                  {isExpanded && topic.notes && (
                    <p className="card-notes">{topic.notes}</p>
                  )}
                  
                  {isExpanded && topic.directions && topic.directions.length > 0 && (
                    <div className="card-directions">
                      <small className="muted">
                        Top direction: {topic.directions[0]?.text}
                      </small>
                    </div>
                  )}
                  
                  {isExpanded && topic.sources && topic.sources.length > 0 && (
                    <div className="card-sources">
                      <small className="muted">
                        {topic.sources.length} source{topic.sources.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                  )}
                  
                  <div className="card-footer">
                    <span className="drag-hint">Click to edit</span>
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
      
      {/* Next Button - only show when in cards flow step */}
      {currentFlowStep === 'cards' && topics.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 24, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <button 
            className="btn" 
            onClick={() => {
              setCurrentFlowStep('list');
              // Trigger view change to list view
              const toggleBtn = document.getElementById('btn-toggle-view');
              if (toggleBtn && !toggleBtn.textContent?.includes('List View')) {
                toggleBtn.click();
              }
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
            ➡️ Next: Add Details in List View
          </button>
        </div>
      )}
    </div>
  );
});
