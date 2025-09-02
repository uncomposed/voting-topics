import React, { useState } from 'react';
import type { PreferenceSet } from '../schema';
import { computePriorityComparison } from '../diff';

interface PriorityHeatmapProps {
  leftPreferenceSet: PreferenceSet;
  rightPreferenceSet: PreferenceSet;
}

export const PriorityHeatmap: React.FC<PriorityHeatmapProps> = ({ 
  leftPreferenceSet, 
  rightPreferenceSet 
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'left' | 'right' | 'diff'>('diff');
  const [filterChanged, setFilterChanged] = useState(false);
  
  const priorityComparison = computePriorityComparison(leftPreferenceSet, rightPreferenceSet);
  
  // Filter and sort the data
  let filteredData = filterChanged 
    ? priorityComparison.filter(p => p.importanceDiff !== 0)
    : priorityComparison;
  
  filteredData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.topicTitle.localeCompare(b.topicTitle);
      case 'left':
        return b.leftImportance - a.leftImportance;
      case 'right':
        return b.rightImportance - a.rightImportance;
      case 'diff':
        return Math.abs(b.importanceDiff) - Math.abs(a.importanceDiff);
      default:
        return 0;
    }
  });
  
  const getImportanceColor = (importance: number) => {
    const intensity = importance / 5;
    return `rgba(139, 211, 255, ${0.3 + intensity * 0.7})`;
  };
  
  const getDiffColor = (diff: number) => {
    if (diff === 0) return 'var(--muted)';
    if (diff > 0) return 'var(--accent-2)';
    return 'var(--danger)';
  };
  
  return (
    <div className="priority-heatmap">
      <div className="heatmap-header">
        <h3>Priority Comparison</h3>
        <div className="heatmap-controls">
          <div className="control-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select"
            >
              <option value="diff">Difference</option>
              <option value="name">Name</option>
              <option value="left">Left Priority</option>
              <option value="right">Right Priority</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>
              <input 
                type="checkbox" 
                checked={filterChanged}
                onChange={(e) => setFilterChanged(e.target.checked)}
              />
              Show only changed
            </label>
          </div>
        </div>
      </div>
      
      <div className="heatmap-legend">
        <div className="legend-item">
          <div className="legend-color left"></div>
          <span>Left Preference Set</span>
        </div>
        <div className="legend-item">
          <div className="legend-color right"></div>
          <span>Right Preference Set</span>
        </div>
        <div className="legend-item">
          <div className="legend-color diff"></div>
          <span>Difference</span>
        </div>
      </div>
      
      <div className="heatmap-grid">
        {filteredData.map(comparison => (
          <div key={comparison.topicId} className="heatmap-item">
            <div className="heatmap-item-header">
              <h4 className="topic-title">{comparison.topicTitle}</h4>
              <div className="topic-meta">
                {comparison.importanceDiff !== 0 && (
                  <span 
                    className="diff-badge"
                    style={{ color: getDiffColor(comparison.importanceDiff) }}
                  >
                    {comparison.importanceDiff > 0 ? '+' : ''}{comparison.importanceDiff}
                  </span>
                )}
              </div>
            </div>
            
            <div className="priority-bars">
              <div className="priority-bar-container">
                <div className="priority-bar-label">Left</div>
                <div className="priority-bar left">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(comparison.leftImportance / 5) * 100}%`,
                      backgroundColor: getImportanceColor(comparison.leftImportance)
                    }}
                  />
                  <span className="bar-value">{comparison.leftImportance}/5</span>
                </div>
              </div>
              
              <div className="priority-bar-container">
                <div className="priority-bar-label">Right</div>
                <div className="priority-bar right">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(comparison.rightImportance / 5) * 100}%`,
                      backgroundColor: getImportanceColor(comparison.rightImportance)
                    }}
                  />
                  <span className="bar-value">{comparison.rightImportance}/5</span>
                </div>
              </div>
            </div>
            
            {comparison.importanceDiff !== 0 && (
              <div className="diff-summary">
                <span className="diff-text">
                  Priority {comparison.importanceDiff > 0 ? 'increased' : 'decreased'} by {Math.abs(comparison.importanceDiff)} point{Math.abs(comparison.importanceDiff) !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredData.length === 0 && (
        <div className="no-data">
          <p>No topics found matching the current filters.</p>
        </div>
      )}
      
      <div className="heatmap-stats">
        <div className="stat">
          <span className="stat-label">Total Topics:</span>
          <span className="stat-value">{priorityComparison.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Priority Changes:</span>
          <span className="stat-value">{priorityComparison.filter(p => p.importanceDiff !== 0).length}</span>
        </div>
      </div>
    </div>
  );
};