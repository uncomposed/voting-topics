import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { uid } from '../utils';

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
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-header-collapsible">
        <h2 className="panel-title">Add from Starter Pack</h2>
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
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" onClick={addSelected} disabled={selected.length === 0}>
              Add Selected ({selected.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
};


