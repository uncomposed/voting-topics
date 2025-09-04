import React, { useMemo, useState } from 'react';
import type { PreferenceSet } from '../schema';
import { PreferenceSetDiffView } from './PreferenceSetDiffView';
import { computePreferenceSetDiff } from '../utils/diff';

interface ImportPreviewProps {
  current: PreferenceSet;
  incoming: PreferenceSet;
  onMerge: (accepted?: Set<string>) => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({ current, incoming, onMerge, onOverwrite, onCancel }) => {
  const diff = useMemo(() => computePreferenceSetDiff(current, incoming), [current, incoming]);
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set([
    ...diff.topics.added.map(t => t.title),
    ...diff.topics.modified.map(t => t.topic.title),
  ]));

  const toggle = (title: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="panel-title">Import Preview</h2>
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn warn" onClick={() => onMerge && (onMerge as any)(accepted)}>Merge</button>
          <button className="btn danger" onClick={onOverwrite}>Overwrite</button>
        </div>
      </div>
      <div className="row" style={{ gap: 12, margin: '8px 0' }}>
        <small className="muted">Select topics to merge (added/modified). Unselected topics are left unchanged. Removals are ignored unless you Overwrite.</small>
      </div>
      <div className="grid two" style={{ marginBottom: 12 }}>
        <div className="panel">
          <h3 className="panel-title">Added Topics</h3>
          {diff.topics.added.length === 0 && <div className="empty">No added topics</div>}
          {diff.topics.added.map(t => (
            <label key={t.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{t.title}</span>
              <input type="checkbox" checked={accepted.has(t.title)} onChange={() => toggle(t.title)} />
            </label>
          ))}
        </div>
        <div className="panel">
          <h3 className="panel-title">Modified Topics</h3>
          {diff.topics.modified.length === 0 && <div className="empty">No modified topics</div>}
          {diff.topics.modified.map(td => (
            <label key={td.topic.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{td.topic.title}</span>
              <input type="checkbox" checked={accepted.has(td.topic.title)} onChange={() => toggle(td.topic.title)} />
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <PreferenceSetDiffView leftPreferenceSet={current} rightPreferenceSet={incoming} />
      </div>
    </div>
  );
};
