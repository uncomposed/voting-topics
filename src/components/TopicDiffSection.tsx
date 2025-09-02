import React, { useState } from 'react';
import type { PreferenceSetDiff, TopicDiff } from '../diff';

interface TopicDiffSectionProps {
  diff: PreferenceSetDiff;
}

export const TopicDiffSection: React.FC<TopicDiffSectionProps> = ({ diff }) => {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  
  const toggleExpanded = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleAllExpanded = () => {
    if (expandedTopics.size === filteredTopics.length) {
      // All are expanded, collapse all
      setExpandedTopics(new Set());
    } else {
      // Some or none are expanded, expand all
      setExpandedTopics(new Set(filteredTopics.map(topic => topic.id)));
    }
  };
  
  const getFilteredTopics = () => {
    switch (filterType) {
      case 'added':
        return diff.topics.added;
      case 'removed':
        return diff.topics.removed;
      case 'modified':
        return diff.topics.modified.map(td => td.topic);
      default:
        return [
          ...diff.topics.added,
          ...diff.topics.removed,
          ...diff.topics.modified.map(td => td.topic)
        ];
    }
  };
  
  const getTopicDiff = (topicId: string): TopicDiff | undefined => {
    return diff.topics.modified.find(td => td.topic.id === topicId);
  };
  
  const getTopicType = (topicId: string): 'added' | 'removed' | 'modified' | 'unchanged' => {
    if (diff.topics.added.some(t => t.id === topicId)) return 'added';
    if (diff.topics.removed.some(t => t.id === topicId)) return 'removed';
    if (diff.topics.modified.some(td => td.topic.id === topicId)) return 'modified';
    return 'unchanged';
  };
  
  const filteredTopics = getFilteredTopics();
  
  return (
    <div className="topic-diff-section">
      <div className="topic-diff-header">
        <h3>Detailed Topic Changes</h3>
        <div className="topic-diff-controls">
          <div className="control-group">
            <label>Filter:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="select"
            >
              <option value="all">All Changes</option>
              <option value="added">Added Only</option>
              <option value="removed">Removed Only</option>
              <option value="modified">Modified Only</option>
            </select>
          </div>
          <button 
            onClick={toggleAllExpanded}
            className="btn"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {expandedTopics.size === filteredTopics.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>
      
      <div className="topic-diff-list">
        {filteredTopics.map(topic => {
          const topicType = getTopicType(topic.id);
          const topicDiff = getTopicDiff(topic.id);
          const isExpanded = expandedTopics.has(topic.id);
          
          return (
            <div key={topic.id} className={`topic-diff-item ${topicType}`}>
              <div 
                className="topic-diff-header-item"
                onClick={() => toggleExpanded(topic.id)}
              >
                <div className="topic-diff-title">
                  <h4>{topic.title}</h4>
                  <span className={`topic-type-badge ${topicType}`}>
                    {topicType.toUpperCase()}
                  </span>
                </div>
                
                <div className="topic-diff-meta">
                  <span className="topic-importance">{topic.importance}/5</span>
                  <span className="expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="topic-diff-details">
                  {topicType === 'added' && (
                    <div className="topic-diff-content">
                      <h5>New Topic</h5>
                      <p className="topic-notes">{topic.notes || 'No notes'}</p>
                      {topic.directions.length > 0 && (
                        <div className="directions-preview">
                          <h6>Directions:</h6>
                          <ul>
                            {topic.directions.map(dir => (
                              <li key={dir.id}>
                                {dir.text} ({dir.stars}/5 stars)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {topicType === 'removed' && (
                    <div className="topic-diff-content">
                      <h5>Removed Topic</h5>
                      <p className="topic-notes">{topic.notes || 'No notes'}</p>
                      {topic.directions.length > 0 && (
                        <div className="directions-preview">
                          <h6>Directions:</h6>
                          <ul>
                            {topic.directions.map(dir => (
                              <li key={dir.id}>
                                {dir.text} ({dir.stars}/5 stars)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {topicType === 'modified' && topicDiff && (
                    <div className="topic-diff-content">
                      <h5>Changes Made</h5>
                      
                      {topicDiff.changes.importance.left !== topicDiff.changes.importance.right && (
                        <div className="change-item">
                          <h6>Importance Changed</h6>
                          <div className="change-comparison">
                            <span className="change-left">{topicDiff.changes.importance.left}/5</span>
                            <span className="change-arrow">→</span>
                            <span className="change-right">{topicDiff.changes.importance.right}/5</span>
                          </div>
                        </div>
                      )}
                      
                      {topicDiff.changes.notes.left !== topicDiff.changes.notes.right && (
                        <div className="change-item">
                          <h6>Notes Changed</h6>
                          <div className="notes-comparison">
                            <div className="notes-left">
                              <strong>Before:</strong>
                              <p>{topicDiff.changes.notes.left || 'No notes'}</p>
                            </div>
                            <div className="notes-right">
                              <strong>After:</strong>
                              <p>{topicDiff.changes.notes.right || 'No notes'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Direction changes */}
                      {(topicDiff.changes.directions.added.length > 0 || 
                        topicDiff.changes.directions.removed.length > 0 || 
                        topicDiff.changes.directions.modified.length > 0) && (
                        <div className="change-item">
                          <h6>Direction Changes</h6>
                          
                          {topicDiff.changes.directions.added.length > 0 && (
                            <div className="direction-changes added">
                              <strong>Added:</strong>
                              <ul>
                                {topicDiff.changes.directions.added.map(dir => (
                                  <li key={dir.id}>
                                    {dir.text} ({dir.stars}/5 stars)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {topicDiff.changes.directions.removed.length > 0 && (
                            <div className="direction-changes removed">
                              <strong>Removed:</strong>
                              <ul>
                                {topicDiff.changes.directions.removed.map(dir => (
                                  <li key={dir.id}>
                                    {dir.text} ({dir.stars}/5 stars)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {topicDiff.changes.directions.modified.length > 0 && (
                            <div className="direction-changes modified">
                              <strong>Modified:</strong>
                              <ul>
                                {topicDiff.changes.directions.modified.map(dirDiff => (
                                  <li key={dirDiff.direction.id}>
                                    <div className="direction-diff">
                                      <div className="direction-text">
                                        <span className="change-left">{dirDiff.changes.text.left}</span>
                                        <span className="change-arrow">→</span>
                                        <span className="change-right">{dirDiff.changes.text.right}</span>
                                      </div>
                                      <div className="direction-stars">
                                        <span className="change-left">{dirDiff.changes.stars.left}/5</span>
                                        <span className="change-arrow">→</span>
                                        <span className="change-right">{dirDiff.changes.stars.right}/5</span>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {filteredTopics.length === 0 && (
        <div className="no-changes">
          <p>No topics found matching the current filter.</p>
        </div>
      )}
    </div>
  );
};