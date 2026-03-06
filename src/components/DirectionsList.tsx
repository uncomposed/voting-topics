import React, { useState } from 'react';
import { Stars } from './Stars';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { getItemsForTopic } from '../utils/items';

interface DirectionsListProps {
  topicId: string;
}

export const DirectionsList: React.FC<DirectionsListProps> = ({ topicId }) => {
  const topics = useStore((state) => state.topics);
  const items = useStore((state) => state.items);
  const addItem = useStore((state) => state.addItem);
  const patchItem = useStore((state) => state.patchItem);
  const removeItem = useStore((state) => state.removeItem);
  const tagItemToTopic = useStore((state) => state.tagItemToTopic);
  const untagItemFromTopic = useStore((state) => state.untagItemFromTopic);
  const [text, setText] = useState('');

  const topicItems = getItemsForTopic(items, topicId);

  const addTopicItem = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addItem(topicId, trimmed);
    setText('');
    toast.show({ variant: 'success', title: 'Item added', message: trimmed, duration: 3000 });
  };

  return (
    <div>
      <div className="directions-help" style={{
        marginBottom: '12px',
        padding: '8px 12px',
        background: 'rgba(139, 211, 255, 0.1)',
        border: '1px solid rgba(139, 211, 255, 0.3)',
        borderRadius: '6px',
        fontSize: '0.85rem',
      }}>
        <strong>Flexible items:</strong> Add outcomes here, rate them, and tag them to more than one topic when they fit multiple themes.
      </div>

      <div className="direction-controls">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && addTopicItem()}
          placeholder="Add an item (e.g., 'housing costs take a smaller share of income')"
          className="input"
        />
        <button onClick={addTopicItem} className="btn" type="button">
          Add
        </button>
      </div>

      {topicItems.map((item) => (
        <div key={item.id} data-direction-id={item.id} className="direction-item">
          <div className="direction-item-header" style={{ alignItems: 'flex-start' }}>
            <input
              className="input"
              value={item.text}
              onChange={(event) => patchItem(item.id, { text: event.target.value })}
              aria-label="Item text"
            />
            <button
              onClick={() => {
                if (item.topicIds.length > 1) {
                  untagItemFromTopic(item.id, topicId);
                } else {
                  removeItem(item.id);
                }
              }}
              className="btn ghost danger"
              aria-label={item.topicIds.length > 1 ? 'Remove item from topic' : 'Delete item'}
              type="button"
            >
              {item.topicIds.length > 1 ? 'Remove From Topic' : 'Delete'}
            </button>
          </div>

          <div className="row">
            <span className="muted">Importance:</span>
            <Stars value={item.stars} onChange={(stars) => patchItem(item.id, { stars })} />
          </div>

          <label className="muted" style={{ display: 'block', marginTop: 8 }}>
            Notes
            <textarea
              className="input"
              rows={2}
              value={item.notes || ''}
              onChange={(event) => patchItem(item.id, { notes: event.target.value })}
              placeholder="Optional notes for this item"
            />
          </label>

          <details style={{ marginTop: 8 }}>
            <summary className="muted" style={{ cursor: 'pointer' }}>Topics</summary>
            <div className="grid" style={{ marginTop: 8 }}>
              {topics.map((topic) => (
                <label key={topic.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{topic.title || 'Untitled Topic'}</span>
                  <input
                    type="checkbox"
                    checked={item.topicIds.includes(topic.id)}
                    onChange={(event) => {
                      if (event.target.checked) tagItemToTopic(item.id, topic.id);
                      else untagItemFromTopic(item.id, topic.id);
                    }}
                  />
                </label>
              ))}
            </div>
          </details>
        </div>
      ))}

      {topicItems.length === 0 && (
        <div className="empty" style={{ marginTop: 8 }}>
          No items tagged to this topic yet. Add your first item above.
        </div>
      )}
    </div>
  );
};
