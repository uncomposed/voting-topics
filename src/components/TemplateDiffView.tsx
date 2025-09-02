import React, { useState } from 'react';
import type { Template } from '../schema';
import { computeTemplateDiff, computePriorityComparison } from '../diff';
import { PriorityHeatmap } from './PriorityHeatmap';
import { TopicDiffSection } from './TopicDiffSection';

interface TemplateDiffViewProps {
  leftTemplate: Template;
  rightTemplate: Template;
  onClose?: () => void;
}

export const TemplateDiffView: React.FC<TemplateDiffViewProps> = ({ 
  leftTemplate, 
  rightTemplate, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'priorities'>('overview');
  
  const diff = computeTemplateDiff(leftTemplate, rightTemplate);
  const priorityComparison = computePriorityComparison(leftTemplate, rightTemplate);
  

  
  return (
    <div className="diff-container">
      <div className="diff-header">
        <div className="diff-header-main">
          <h1>Template Comparison</h1>
          <div className="diff-titles">
            <div className="diff-title">
              <span className="diff-label">Left:</span>
              <span className="diff-title-text">{diff.title.left}</span>
            </div>
            <div className="diff-title">
              <span className="diff-label">Right:</span>
              <span className="diff-title-text">{diff.title.right}</span>
            </div>
          </div>
        </div>
        
        {onClose && (
          <button onClick={onClose} className="btn ghost">
            ✕ Close
          </button>
        )}
      </div>
      
      <div className="diff-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number" style={{ color: 'var(--accent-2)' }}>
              +{diff.summary.addedCount}
            </span>
            <span className="stat-label">Added</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: 'var(--danger)' }}>
              -{diff.summary.removedCount}
            </span>
            <span className="stat-label">Removed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: 'var(--warn)' }}>
              ~{diff.summary.modifiedCount}
            </span>
            <span className="stat-label">Modified</span>
          </div>
          <div className="stat-item">
            <span className="stat-number" style={{ color: 'var(--muted)' }}>
              ={diff.summary.unchangedCount}
            </span>
            <span className="stat-label">Unchanged</span>
          </div>
        </div>
        
        <div className="summary-total">
          <span className="total-label">Total Topics:</span>
          <span className="total-number">{diff.summary.totalTopics}</span>
        </div>
      </div>
      
      <div className="diff-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          Topic Details
        </button>
        <button 
          className={`tab ${activeTab === 'priorities' ? 'active' : ''}`}
          onClick={() => setActiveTab('priorities')}
        >
          Priority Heatmap
        </button>
      </div>
      
      <div className="diff-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-section">
              <h3>Quick Summary</h3>
              <div className="overview-grid">
                <div className="overview-card">
                  <h4>Added Topics</h4>
                  {diff.topics.added.length === 0 ? (
                    <p className="no-changes">No new topics added</p>
                  ) : (
                    <ul className="topic-list">
                      {diff.topics.added.map(topic => (
                        <li key={topic.id} className="topic-item added">
                          <span className="topic-title">{topic.title}</span>
                          <span className="topic-importance">{topic.importance}/5</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="overview-card">
                  <h4>Removed Topics</h4>
                  {diff.topics.removed.length === 0 ? (
                    <p className="no-changes">No topics removed</p>
                  ) : (
                    <ul className="topic-list">
                      {diff.topics.removed.map(topic => (
                        <li key={topic.id} className="topic-item removed">
                          <span className="topic-title">{topic.title}</span>
                          <span className="topic-importance">{topic.importance}/5</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="overview-card">
                  <h4>Modified Topics</h4>
                  {diff.topics.modified.length === 0 ? (
                    <p className="no-changes">No topics modified</p>
                  ) : (
                    <ul className="topic-list">
                      {diff.topics.modified.map(topicDiff => (
                        <li key={topicDiff.topic.id} className="topic-item modified">
                          <span className="topic-title">{topicDiff.topic.title}</span>
                          <div className="topic-changes">
                            {topicDiff.changes.importance.left !== topicDiff.changes.importance.right && (
                              <span className="change-badge">
                                {topicDiff.changes.importance.left}→{topicDiff.changes.importance.right}
                              </span>
                            )}

                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overview-section">
              <h3>Priority Changes</h3>
              <div className="priority-summary">
                {priorityComparison
                  .filter(p => p.importanceDiff !== 0)
                  .sort((a, b) => Math.abs(b.importanceDiff) - Math.abs(a.importanceDiff))
                  .slice(0, 5)
                  .map(comparison => (
                    <div key={comparison.topicId} className="priority-change">
                      <span className="topic-title">{comparison.topicTitle}</span>
                      <div className="priority-diff">
                        <span className="priority-left">{comparison.leftImportance}/5</span>
                        <span className="priority-arrow">→</span>
                        <span className="priority-right">{comparison.rightImportance}/5</span>
                        <span className={`priority-change-amount ${comparison.importanceDiff > 0 ? 'positive' : 'negative'}`}>
                          {comparison.importanceDiff > 0 ? '+' : ''}{comparison.importanceDiff}
                        </span>
                      </div>
                    </div>
                  ))}
                {priorityComparison.filter(p => p.importanceDiff !== 0).length === 0 && (
                  <p className="no-changes">No priority changes</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'topics' && (
          <TopicDiffSection diff={diff} />
        )}
        
        {activeTab === 'priorities' && (
          <PriorityHeatmap 
            leftPreferenceSet={leftTemplate} 
            rightPreferenceSet={rightTemplate} 
          />
        )}
      </div>
    </div>
  );
};
