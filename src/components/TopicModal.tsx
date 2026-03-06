import React from 'react';
import type { Topic } from '../schema';
import { DirectionsList } from './DirectionsList';
import { Stars } from './Stars';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { getItemsForTopic } from '../utils/items';

interface TopicModalProps {
  topic: Topic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (topicId: string, updates: Partial<Topic>) => void;
  onDelete: (topicId: string) => void;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  topic,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const items = useStore((state) => state.items);

  if (!topic || !isOpen) return null;

  const topicItems = getItemsForTopic(items, topic.id);

  const handleDelete = () => {
    const state = useStore.getState();
    const idx = state.topics.findIndex((currentTopic) => currentTopic.id === topic.id);
    const snapshot = state.topics.find((currentTopic) => currentTopic.id === topic.id);
    onDelete(topic.id);
    onClose();
    if (snapshot && idx >= 0) {
      toast.show({
        variant: 'warn',
        title: 'Topic deleted',
        message: snapshot.title ? `"${snapshot.title}" was removed` : 'A topic was removed',
        actionLabel: 'Undo',
        onAction: () => {
          useStore.setState((storeState) => ({
            topics: [
              ...storeState.topics.slice(0, idx),
              snapshot,
              ...storeState.topics.slice(idx),
            ],
          }));
        },
        duration: 6000,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{topic.title || 'Untitled Topic'}</h2>
          <div className="modal-header-actions">
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="edit-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={topic.title || ''}
                onChange={(event) => onSave(topic.id, { title: event.target.value })}
                placeholder="Topic title"
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Importance</label>
              <Stars
                value={topic.importance || 0}
                onChange={(value) => onSave(topic.id, { importance: value })}
              />
              <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                Topic priority stays separate from the individual item ratings inside it.
              </div>
            </div>

            <div className="form-group">
              <label>Items</label>
              <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                Items are shared across topics when tagged to multiple places. Editing one updates every topic it appears in.
              </div>
              <DirectionsList topicId={topic.id} />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={topic.notes || ''}
                onChange={(event) => onSave(topic.id, { notes: event.target.value })}
                placeholder="Why you feel this way; tradeoffs; personal thresholds..."
                className="input"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Sources</label>
              <div className="sources-list">
                {(topic.sources || []).map((source, index) => (
                  <div key={index} className="source-row">
                    <input
                      type="text"
                      value={source.label}
                      onChange={(event) => onSave(topic.id, {
                        sources: topic.sources.map((current, currentIdx) => currentIdx === index ? { ...current, label: event.target.value } : current),
                      })}
                      placeholder="Label"
                      className="input"
                    />
                    <input
                      type="url"
                      value={source.url}
                      onChange={(event) => onSave(topic.id, {
                        sources: topic.sources.map((current, currentIdx) => currentIdx === index ? { ...current, url: event.target.value } : current),
                      })}
                      placeholder="https://..."
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={() => onSave(topic.id, { sources: topic.sources.filter((_, currentIdx) => currentIdx !== index) })}
                      className="btn ghost danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(topic.sources || []).length < 5 && (
                  <button
                    type="button"
                    onClick={() => onSave(topic.id, { sources: [...topic.sources, { label: '', url: '' }] })}
                    className="btn ghost"
                  >
                    Add Source
                  </button>
                )}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <h3 className="panel-title">Topic Snapshot</h3>
              <div className="muted">{topicItems.length} item{topicItems.length !== 1 ? 's' : ''} currently tagged here.</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost danger" onClick={handleDelete}>Delete Topic</button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
