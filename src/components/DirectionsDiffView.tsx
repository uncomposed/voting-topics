import React, { useMemo } from 'react';
import type { PreferenceSet, Topic, Direction } from '../schema';
import { useExpandedState } from '../hooks/useExpandedState';
import { useDirectionsFilters } from '../hooks/useFilters';

interface DirectionsDiffViewProps {
  leftPreferenceSet: PreferenceSet;
  rightPreferenceSet: PreferenceSet;
}

interface DirectionComparison {
  direction: Direction;
  topicTitle: string;
  leftStars: number;
  rightStars: number;
  starsDiff: number;
  isAdded: boolean;
  isRemoved: boolean;
  isModified: boolean;
}

export const DirectionsDiffView: React.FC<DirectionsDiffViewProps> = ({ 
  leftPreferenceSet, 
  rightPreferenceSet 
}) => {
  const { expandedItems, toggleExpanded, toggleAllExpanded, isExpanded } = useExpandedState();
  const { filters, updateFilter } = useDirectionsFilters();

  // Compute all direction comparisons
  const directionComparisons = useMemo(() => {
    const comparisons: DirectionComparison[] = [];
    const allTopics = new Map<string, { left?: Topic; right?: Topic }>();

    // Collect all topics
    for (const topic of leftPreferenceSet.topics) {
      allTopics.set(topic.title, { left: topic });
    }
    for (const topic of rightPreferenceSet.topics) {
      const existing = allTopics.get(topic.title);
      if (existing) {
        existing.right = topic;
      } else {
        allTopics.set(topic.title, { right: topic });
      }
    }

    // Compare directions for each topic
    for (const [topicTitle, { left, right }] of allTopics) {
      const leftDirections = left?.directions || [];
      const rightDirections = right?.directions || [];

      // Find matching directions
      const matchedDirections = new Set<string>();
      
      for (const leftDir of leftDirections) {
        const rightDir = rightDirections.find(rd => 
          rd.text.toLowerCase().trim() === leftDir.text.toLowerCase().trim()
        );
        
        if (rightDir) {
          matchedDirections.add(leftDir.text);
          comparisons.push({
            direction: rightDir,
            topicTitle,
            leftStars: leftDir.stars,
            rightStars: rightDir.stars,
            starsDiff: rightDir.stars - leftDir.stars,
            isAdded: false,
            isRemoved: false,
            isModified: leftDir.stars !== rightDir.stars
          });
        } else {
          // Direction was removed
          comparisons.push({
            direction: leftDir,
            topicTitle,
            leftStars: leftDir.stars,
            rightStars: 0,
            starsDiff: -leftDir.stars,
            isAdded: false,
            isRemoved: true,
            isModified: false
          });
        }
      }

      // Find added directions
      for (const rightDir of rightDirections) {
        if (!matchedDirections.has(rightDir.text)) {
          comparisons.push({
            direction: rightDir,
            topicTitle,
            leftStars: 0,
            rightStars: rightDir.stars,
            starsDiff: rightDir.stars,
            isAdded: true,
            isRemoved: false,
            isModified: false
          });
        }
      }
    }

    return comparisons;
  }, [leftPreferenceSet, rightPreferenceSet]);

  // Apply filters
  const filteredComparisons = useMemo(() => {
    let filtered = [...directionComparisons];

    // Topic filter
    if (filters.topicFilter !== 'all') {
      const topicImportanceMap = new Map<string, { left: number; right: number }>();
      
      // Build topic importance map
      for (const topic of leftPreferenceSet.topics) {
        topicImportanceMap.set(topic.title, { left: topic.importance, right: 0 });
      }
      for (const topic of rightPreferenceSet.topics) {
        const existing = topicImportanceMap.get(topic.title);
        if (existing) {
          existing.right = topic.importance;
        } else {
          topicImportanceMap.set(topic.title, { left: 0, right: topic.importance });
        }
      }

      filtered = filtered.filter(comp => {
        const topicImportance = topicImportanceMap.get(comp.topicTitle);
        if (!topicImportance) return false;

        switch (filters.topicFilter) {
          case 'similar':
            return Math.abs(topicImportance.left - topicImportance.right) <= 1;
          case 'different':
            return Math.abs(topicImportance.left - topicImportance.right) > 1;
          case 'missing':
            return topicImportance.left === 0 || topicImportance.right === 0;
          default:
            return true;
        }
      });
    }

    // Direction filter
    if (filters.directionFilter !== 'all') {
      filtered = filtered.filter(comp => {
        switch (filters.directionFilter) {
          case 'matching':
            return !comp.isAdded && !comp.isRemoved && !comp.isModified;
          case 'most_different':
            return Math.abs(comp.starsDiff) >= 3;
          case 'highest_rated':
            return comp.leftStars >= 4 || comp.rightStars >= 4;
          default:
            return true;
        }
      });
    }

    // Magnitude filter
    if (filters.magnitudeFilter !== 'all') {
      filtered = filtered.filter(comp => {
        switch (filters.magnitudeFilter) {
          case 'high_diff':
            return Math.abs(comp.starsDiff) >= 2;
          case 'high_rating':
            return comp.leftStars >= 3 || comp.rightStars >= 3;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [directionComparisons, filters, leftPreferenceSet, rightPreferenceSet]);

  // Group by topic
  const groupedComparisons = useMemo(() => {
    const groups = new Map<string, DirectionComparison[]>();
    
    for (const comp of filteredComparisons) {
      if (!groups.has(comp.topicTitle)) {
        groups.set(comp.topicTitle, []);
      }
      groups.get(comp.topicTitle)!.push(comp);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredComparisons]);



  const getDirectionTypeColor = (comp: DirectionComparison) => {
    if (comp.isAdded) return 'var(--accent-2)';
    if (comp.isRemoved) return 'var(--danger)';
    if (comp.isModified) return 'var(--warn)';
    return 'var(--muted)';
  };

  const getDirectionTypeLabel = (comp: DirectionComparison) => {
    if (comp.isAdded) return 'Added';
    if (comp.isRemoved) return 'Removed';
    if (comp.isModified) return 'Modified';
    return 'Unchanged';
  };

  return (
    <div className="directions-diff-view">
      <div className="directions-header">
        <h3>Direction-Level Analysis</h3>
        <p className="directions-description">
          Compare specific outcomes and their importance ratings across both preference sets.
        </p>
      </div>

      <div className="directions-filters">
        <div className="muted" style={{ fontWeight: 600, marginBottom: 4 }}>Filters</div>
        <div className="filter-group">
          <label>Topic</label>
          <select 
            value={filters.topicFilter} 
            onChange={(e) => updateFilter('topicFilter', e.target.value as any)}
            className="select"
          >
            <option value="all">All Topics</option>
            <option value="similar">Similar Priority</option>
            <option value="different">Different Priority</option>
            <option value="missing">Missing Topics</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Direction</label>
          <select 
            value={filters.directionFilter} 
            onChange={(e) => updateFilter('directionFilter', e.target.value as any)}
            className="select"
          >
            <option value="all">All Directions</option>
            <option value="matching">Matching</option>
            <option value="most_different">Most Different</option>
            <option value="highest_rated">Highest Rated</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Magnitude</label>
          <select 
            value={filters.magnitudeFilter} 
            onChange={(e) => updateFilter('magnitudeFilter', e.target.value as any)}
            className="select"
          >
            <option value="all">All Magnitudes</option>
            <option value="high_diff">High Difference</option>
            <option value="high_rating">High Rating</option>
          </select>
        </div>

        <button 
          onClick={() => toggleAllExpanded(groupedComparisons.map(([topicTitle]) => topicTitle))}
          className="btn"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          {expandedItems.size === groupedComparisons.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="directions-stats">
        <div className="stat">
          <span className="stat-label">Total Directions:</span>
          <span className="stat-value">{directionComparisons.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Filtered:</span>
          <span className="stat-value">{filteredComparisons.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Topics:</span>
          <span className="stat-value">{groupedComparisons.length}</span>
        </div>
      </div>

      <div className="directions-list">
        {groupedComparisons.map(([topicTitle, comparisons]) => (
          <div key={topicTitle} className="topic-directions-group">
            <div 
              className="topic-directions-header"
              onClick={() => toggleExpanded(topicTitle)}
            >
              <h4>{topicTitle}</h4>
              <div className="topic-directions-meta">
                <span className="direction-count">{comparisons.length} directions</span>
                <span className="expand-icon">
                  {isExpanded(topicTitle) ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {isExpanded(topicTitle) && (
              <div className="topic-directions-content">
                {comparisons.map((comp, index) => (
                  <div key={index} className="direction-comparison">
                    <div className="direction-header">
                      <div className="direction-text">{comp.direction.text}</div>
                      <span 
                        className="direction-type-badge"
                        style={{ backgroundColor: getDirectionTypeColor(comp) }}
                      >
                        {getDirectionTypeLabel(comp)}
                      </span>
                    </div>

                    <div className="direction-stars-comparison">
                      <div className="stars-bar">
                        <div className="stars-label">Left:</div>
                        <div className="stars-display">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span 
                              key={i} 
                              className={`star ${i < comp.leftStars ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="stars-value">{comp.leftStars}/5</span>
                        </div>
                      </div>

                      <div className="stars-bar">
                        <div className="stars-label">Right:</div>
                        <div className="stars-display">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span 
                              key={i} 
                              className={`star ${i < comp.rightStars ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="stars-value">{comp.rightStars}/5</span>
                        </div>
                      </div>

                      {comp.starsDiff !== 0 && (
                        <div className="stars-diff">
                          <span className={`diff-amount ${comp.starsDiff > 0 ? 'positive' : 'negative'}`}>
                            {comp.starsDiff > 0 ? '+' : ''}{comp.starsDiff}
                          </span>
                        </div>
                      )}
                    </div>

                    {comp.direction.notes && (
                      <div className="direction-notes">
                        <strong>Notes:</strong> {comp.direction.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedComparisons.length === 0 && (
        <div className="no-directions">
          <p>No directions found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};
