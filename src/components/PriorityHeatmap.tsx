import React, { useState } from 'react';
import type { PreferenceSet } from '../schema';
import { computePriorityComparison } from '../diff';

interface PriorityHeatmapProps {
  leftPreferenceSet: PreferenceSet;
  rightPreferenceSet: PreferenceSet;
}

const clampImportance = (value: number) => Math.max(0, Math.min(5, value));

const paletteSetA = ['#f1f6ff', '#d6e7ff', '#accdff', '#79adff', '#4f95ff', '#215fce'];
const paletteSetB = ['#effaf4', '#c8f1dd', '#9ce6c4', '#68d7a3', '#34c182', '#1a8c58'];

const getPaletteColor = (value: number, palette: string[]) => {
  const normalized = Math.round(clampImportance(value));
  return palette[normalized];
};

const formatImportance = (value: number) => {
  const normalized = clampImportance(value);
  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
};

export const PriorityHeatmap: React.FC<PriorityHeatmapProps> = ({ 
  leftPreferenceSet, 
  rightPreferenceSet 
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'left' | 'right' | 'diff'>('diff');
  const [filterChanged, setFilterChanged] = useState(false);
  
  const priorityComparison = computePriorityComparison(leftPreferenceSet, rightPreferenceSet);
  
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
      default:
        return Math.abs(b.importanceDiff) - Math.abs(a.importanceDiff);
    }
  });

  const renderDiffBadge = (diff: number) => {
    if (diff === 0) {
      return <span className="diff-badge neutral">Match</span>;
    }
    if (diff > 0) {
      return <span className="diff-badge positive">Set B +{diff}</span>;
    }
    return <span className="diff-badge negative">Set A +{Math.abs(diff)}</span>;
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
              <option value="name">Topic name</option>
              <option value="left">Set A priority</option>
              <option value="right">Set B priority</option>
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
          <div className="legend-color set-a"></div>
          <span>Set A (reference)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color set-b"></div>
          <span>Set B (comparison)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color diff"></div>
          <span>Set B − Set A</span>
        </div>
      </div>

      <div className="heatmap-table-wrapper">
        <table className="heatmap-table">
          <caption className="sr-only">Topic priority comparison between Set A and Set B</caption>
          <thead>
            <tr>
              <th scope="col" className="topic-column">Topic</th>
              <th scope="col">Set A</th>
              <th scope="col">Set B</th>
              <th scope="col">Δ</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(comparison => {
              const leftImportance = clampImportance(comparison.leftImportance);
              const rightImportance = clampImportance(comparison.rightImportance);
              const diff = comparison.importanceDiff;
              const colorA = getPaletteColor(leftImportance, paletteSetA);
              const colorB = getPaletteColor(rightImportance, paletteSetB);
              const textColorA = leftImportance >= 3 ? '#ffffff' : 'var(--text)';
              const textColorB = rightImportance >= 3 ? '#ffffff' : 'var(--text)';

              return (
                <tr key={comparison.topicId}>
                  <th scope="row" className="heatmap-topic">
                    <span>{comparison.topicTitle}</span>
                  </th>
                  <td className="heatmap-cell set-a">
                    <div
                      className="importance-chip"
                      style={{ backgroundColor: colorA, color: textColorA }}
                    >
                      <span aria-hidden="true">{formatImportance(leftImportance)}</span>
                      <span className="chip-suffix" aria-hidden="true">/5</span>
                      <span className="sr-only">Set A priority {leftImportance} out of 5</span>
                    </div>
                  </td>
                  <td className="heatmap-cell set-b">
                    <div
                      className="importance-chip"
                      style={{ backgroundColor: colorB, color: textColorB }}
                    >
                      <span aria-hidden="true">{formatImportance(rightImportance)}</span>
                      <span className="chip-suffix" aria-hidden="true">/5</span>
                      <span className="sr-only">Set B priority {rightImportance} out of 5</span>
                    </div>
                  </td>
                  <td className="heatmap-cell diff">{renderDiffBadge(diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          <span className="stat-label">Priority changes:</span>
          <span className="stat-value">{priorityComparison.filter(p => p.importanceDiff !== 0).length}</span>
        </div>
      </div>
    </div>
  );
};
