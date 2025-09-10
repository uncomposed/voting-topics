import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import starterPackData from '../../starter-pack.v2.4.json';
import type { StarterPackJson, StarterTopicJson } from '../types';

const starterPack: StarterPackJson = starterPackData;

export const StarterPackPicker: React.FC = () => {
  const topics = useStore(state => state.topics);
  const addTopicFromStarter = useStore(state => state.addTopicFromStarter);
  const currentFlowStep = useStore(state => state.currentFlowStep);
  const advanceFlowStep = useStore(state => state.advanceFlowStep);
  const [pool, setPool] = useState<StarterTopicJson[]>(() => {
    const raw = starterPack.topics || [];
    return raw.map((t) => ({
      id: t.id,
      title: t.title,
      directions: (t.directions || []).map((d) => ({ id: d.id, text: d.text }))
    }));
  });
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

  const handleAdd = (topic: StarterTopicJson) => {
    addTopicFromStarter(topic);
    // Remove from pool so it's not offered again
    setPool(prev => prev.filter(p => p.id !== topic.id));
    // Notify user and move them along the flow
    toast.show({ variant: 'success', title: 'Topic added', message: topic.title, duration: 3000 });
    if (currentFlowStep === 'starter') advanceFlowStep();
    // Scroll to the newly added topic
    const newId = useStore.getState().topics[0]?.id;
    setTimeout(() => {
      if (newId) {
        const target = document.querySelector(`[data-topic-id="${newId}"]`) as HTMLElement | null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

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
                Click a topic below to add it to your list
              </p>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                When you're ready, try the LLM assistant under More actions to draft a ballot for your election.
              </p>
            </>
          ) : (
            <>
              <h2 className="panel-title">🚀 Get Started with Starter Pack</h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                Click a topic below to jumpstart your preferences
              </p>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                Aim for about 3–7 topics. You can later ask the AI helper to build a ballot using the web and our schema.
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
                  onChange={() => handleAdd(item)}
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
        </>
      )}
    </div>
  );
};
