import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
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

export const TopicCards = forwardRef<{ toggleExpanded: () => void; updateButtonText: () => void }, TopicCardsProps>(({ topics, onReorder, onTopicClick }, ref) => {
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
          console.log('Main button clicked! Current state:', isExpanded);
          setIsExpanded(!isExpanded);
        };
        
        // Set initial button text
        freshBtn.textContent = isExpanded ? '▼ Collapse All' : '▶ Expand All';
      }
    }
  }, [isExpanded]);

  useImperativeHandle(ref, () => ({
    toggleExpanded: () => {
      console.log('TopicCards toggleExpanded called, current state:', isExpanded);
      setIsExpanded(prev => {
        const newState = !prev;
        console.log('Setting isExpanded to:', newState);
        
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
      <div className="cards-header">
        <div className="cards-header-top">
          <h2>Topic Priority View</h2>
        </div>
        <p className="muted">Drag cards to reorder by importance. Click to edit details.</p>
        <p className="muted" style={{fontSize: '12px'}}>Debug: isExpanded = {isExpanded ? 'true' : 'false'}</p>
        <div style={{
          padding: '8px',
          background: isExpanded ? '#4CAF50' : '#f44336',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {isExpanded ? 'EXPANDED - Cards should show details' : 'COLLAPSED - Cards should hide details'}
        </div>
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
                    <div className="card-directions">
                      <div className="direction-dots">
                        {Array.from({ length: Math.max(1, topic.directions.length) }).map((_, i) => (
                          <span 
                            key={i} 
                            className={`direction-dot ${i < topic.directions.length ? (topic.directions[i].stars > 0 ? 'rated' : 'unrated') : 'no-directions'}`}
                            title={i < topic.directions.length ? `${topic.directions[i].stars}/5 stars` : 'No direction'}
                          >
                            {i < topic.directions.length ? (topic.directions[i].stars > 0 ? '●' : '○') : '○'}
                          </span>
                        ))}
                      </div>
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
    </div>
  );
});
