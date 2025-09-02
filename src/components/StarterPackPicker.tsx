import React, { useEffect, useState } from 'react';
import { useStore } from '../store';


interface StarterTopic { 
  id: string; 
  title: string; 
  directions: Array<{ text: string }>;
}

export const StarterPackPicker: React.FC = () => {
  const topics = useStore(state => state.topics);
  const addTopicFromStarter = useStore(state => state.addTopicFromStarter);
  const [pool, setPool] = useState<StarterTopic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Load lazily from bundled JSON (tsconfig resolves JSON imports)
    import('../../starter-pack.v1.json')
      .then((m: any) => {
        const topics = (m.default?.topics || m.topics || []) as Array<{ 
          id: string; 
          title: string; 
          directions: Array<{ text: string }>;
        }>;
        setPool(topics.map(t => ({ 
          id: t.id, 
          title: t.title, 
          directions: t.directions || []
        })));
      })
      .catch(() => setPool([]));
  }, []);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addSelected = () => {
    const selectedTopics = pool.filter(p => selected.includes(p.id));
    selectedTopics.forEach(topic => {
      addTopicFromStarter(topic);
    });
    setSelected([]);
  };

  const toggleAll = () => {
    if (selected.length === pool.length) {
      setSelected([]);
    } else {
      setSelected(pool.map(p => p.id));
    }
  };

  // Show starter pack when there are no topics (empty state)
  if (topics.length > 0) return null;

  return (
    <div className="panel starter-pack-panel" style={{ marginTop: 16 }}>
      <div className="panel-header-collapsible">
        <div>
          <h2 className="panel-title">🚀 Get Started with Starter Pack</h2>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Choose from {pool.length} pre-built topics to jumpstart your preferences
          </p>
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
          <div className="starter-pack-controls" style={{ marginBottom: 12 }}>
            <button className="btn ghost" onClick={toggleAll}>
              {selected.length === pool.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="muted" style={{ marginLeft: 'auto' }}>
              {selected.length} of {pool.length} selected
            </span>
          </div>
          <div className="starter-pack-list">
            {pool.map((item) => (
              <label key={item.id} className="starter-pack-item">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="starter-pack-title">{item.title}</span>
              </label>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 20, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
            <button 
              className="btn primary" 
              onClick={addSelected} 
              disabled={selected.length === 0}
              style={{ 
                fontSize: '1rem', 
                padding: '12px 24px',
                fontWeight: '600'
              }}
            >
              ✨ Add {selected.length} Selected Topic{selected.length !== 1 ? 's' : ''} to My List
            </button>
          </div>
        </>
      )}
    </div>
  );
};


