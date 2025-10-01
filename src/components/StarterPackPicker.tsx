import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import starterPackData from '../../starter-pack.v2.4.json';
import type { StarterPackJson, StarterTopicJson } from '../types';

const starterPack: StarterPackJson = starterPackData;

type StarterTopic = Pick<StarterTopicJson, 'id' | 'title'> & {
  directions: Array<{ text: string }>;
};

export const StarterPackPicker: React.FC = () => {
  const topics = useStore(state => state.topics);
  const addTopicFromStarter = useStore(state => state.addTopicFromStarter);
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const advanceFlowStep = useStore(state => state.advanceFlowStep);
  const [pool, setPool] = useState<StarterTopic[]>(() => {
    const raw = starterPack.topics || [];
    return raw.map((t) => ({
      id: t.id,
      title: t.title,
      directions: (t.directions || []).map((d) => ({ text: d.text }))
    }));
  });
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(() => new Set<string>());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const autoCollapsed = useRef(false);

  // Static import above removes dynamic import warning and is fine for this payload size

  // Auto-collapse once when topics first appear
  useEffect(() => {
    if (topics.length > 0 && !isCollapsed && !autoCollapsed.current) {
      setIsCollapsed(true);
      autoCollapsed.current = true;
    }
  }, [topics.length, isCollapsed]);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const handleAddSelected = useCallback(() => {
    const topicsToAdd = pool.filter(topic => selectedTopics.has(topic.id));
    if (topicsToAdd.length === 0) return;

    topicsToAdd.forEach(topic => {
      addTopicFromStarter(topic);
    });

    setPool(prev => prev.filter(p => !selectedTopics.has(p.id)));
    setSelectedTopics(() => new Set<string>());

    toast.show({
      variant: 'success',
      title: 'Topics added',
      message: `${topicsToAdd.length} topic${topicsToAdd.length > 1 ? 's' : ''} added to your list`,
      duration: 3000,
    });

    if (currentFlowStep === 'starter') advanceFlowStep();
  }, [addTopicFromStarter, advanceFlowStep, currentFlowStep, pool, selectedTopics]);

  useEffect(() => {
    const handleEvent = () => handleAddSelected();
    window.addEventListener('vt-starter-add-selected', handleEvent as EventListener);
    return () => window.removeEventListener('vt-starter-add-selected', handleEvent as EventListener);
  }, [handleAddSelected]);

  // Always show starter pack, but in minimized state when topics exist
  const hasTopics = topics.length > 0;

  // Open/expand when requested from toolbar
  useEffect(() => {
    const openStarter = () => setIsCollapsed(false);
    window.addEventListener('vt-open-starter', openStarter as EventListener);
    return () => {
      window.removeEventListener('vt-open-starter', openStarter as EventListener);
    };
  }, []);

  return (
    <div id="starter-pack" className="panel starter-pack-panel" style={{ marginTop: 16 }}>
      <div className="panel-header-collapsible">
        <div>
          {hasTopics ? (
            <>
              <h2 className="panel-title">➕ Add More Topics</h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                Select topics below and click "Add Selected" to add them to your list
              </p>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                When you're ready, try the LLM assistant under More actions to draft a ballot for your election.
              </p>
            </>
          ) : (
            <>
              <h2 className="panel-title">🚀 Get Started with Starter Pack</h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                Select at least 3 topics to get started, but feel free to choose more if you'd like
              </p>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                You can later ask the AI helper to build a ballot using the web and our schema.
              </p>
            </>
          )}
        </div>
        <button 
          className="btn ghost starter-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand starter pack' : 'Collapse starter pack'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          <div className="starter-pack-list">
            {pool.map((item) => (
              <label key={item.id} className="starter-pack-item">
                <input
                  type="checkbox"
                  checked={selectedTopics.has(item.id)}
                  onChange={() => handleTopicSelect(item.id)}
                />
                <span className="starter-pack-title">{item.title}</span>
              </label>
            ))}
            {pool.length === 0 && (
              <p className="muted" style={{ padding: '8px 0' }}>
                All starter topics added.
              </p>
            )}
          </div>
          {selectedTopics.size > 0 && (
            <div style={{ marginTop: '12px', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn primary"
                onClick={handleAddSelected}
                style={{ width: '100%' }}
              >
                Add Selected ({selectedTopics.size})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
