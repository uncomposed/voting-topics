import React, { useState, useEffect } from 'react';
import { Topic } from '../schema';
import { DirectionsList } from './DirectionsList';
import { Stars } from './Stars';
import { useStore } from '../store';
import { toast } from '../utils/toast';

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
  onDelete 
}) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Topic>>({});

  useEffect(() => {
    if (topic) {
      setFormData(topic);
      setEditing(false);
    }
  }, [topic]);

  // Update form data when topic changes (for real-time updates)
  useEffect(() => {
    if (topic && !editing) {
      setFormData(topic);
    }
  }, [topic, editing]);

  if (!topic || !isOpen) return null;

  const handleSave = () => {
    onSave(topic.id, formData);
    setEditing(false);
    onClose(); // Close modal after saving to show updated data in main view
  };

  const handleCancel = () => {
    setFormData(topic);
    setEditing(false);
  };

  const handleDelete = () => {
    // Snapshot topic and index for precise undo
    const state = useStore.getState();
    const idx = state.topics.findIndex(t => t.id === topic.id);
    const snapshot = state.topics.find(t => t.id === topic.id);
    onDelete(topic.id);
    onClose();
    if (snapshot && idx >= 0) {
      toast.show({
        variant: 'warn',
        title: 'Topic deleted',
        message: snapshot.title ? `"${snapshot.title}" was removed` : 'A topic was removed',
        actionLabel: 'Undo',
        onAction: () => {
          useStore.setState(s => ({
            topics: [
              ...s.topics.slice(0, idx),
              snapshot,
              ...s.topics.slice(idx)
            ]
          }));
        },
        duration: 6000,
      });
    }
  };

  const updateField = (field: keyof Topic, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSource = () => {
    const newSources = [...(formData.sources || []), { label: '', url: '' }];
    updateField('sources', newSources);
  };

  const removeSource = (index: number) => {
    const newSources = (formData.sources || []).filter((_, i) => i !== index);
    updateField('sources', newSources);
  };

  const updateSource = (index: number, field: 'label' | 'url', value: string) => {
    const newSources = [...(formData.sources || [])];
    newSources[index] = { ...newSources[index], [field]: value };
    updateField('sources', newSources);
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Edit Topic' : topic.title || 'Untitled Topic'}</h2>
          <div className="modal-header-actions">
            {editing && (
              <>
                <button className="btn" onClick={handleSave}>Save & Close</button>
                <button className="btn ghost" onClick={handleCancel}>Cancel</button>
              </>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {editing ? (
            // Edit Form
            <div className="edit-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="Topic title"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Importance</label>
                <Stars 
                  value={formData.importance || 0} 
                  onChange={(value) => updateField('importance', value)} 
                />
              </div>



              <div className="form-group">
                <label>Directions</label>
                <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                  Add specific outcomes or changes you want to see within this topic. Each direction gets its own importance rating.
                </div>
                <DirectionsList 
                  directions={formData.directions || []}
                  onChange={(directions) => updateField('directions', directions)}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder="Why you feel this way; tradeoffs; personal thresholds..."
                  className="input"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Sources</label>
                <div className="sources-list">
                  {(formData.sources || []).map((source, index) => (
                    <div key={index} className="source-row">
                      <input
                        type="text"
                        value={source.label}
                        onChange={e => updateSource(index, 'label', e.target.value)}
                        placeholder="Label"
                        className="input"
                      />
                      <input
                        type="url"
                        value={source.url}
                        onChange={e => updateSource(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="input"
                      />
                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="btn ghost danger"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {(formData.sources || []).length < 5 && (
                    <button type="button" onClick={addSource} className="btn ghost">
                      Add Source
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="view-mode">
              <div className="topic-info">
                <div className="info-row">
                  <strong>Importance:</strong> {topic.importance}/5
                </div>

                {topic.directions && topic.directions.length > 0 && (
                  <div className="info-row">
                    <strong>Directions:</strong>
                    <ul className="directions-list">
                      {topic.directions.map((direction) => (
                        <li key={direction.id}>
                          <strong>{direction.text}</strong> ({direction.stars}/5 stars)
                          {direction.notes && <p className="direction-notes">{direction.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {topic.notes && (
                  <div className="info-row">
                    <strong>Notes:</strong>
                    <p>{topic.notes}</p>
                  </div>
                )}
                {topic.sources && topic.sources.length > 0 && (
                  <div className="info-row">
                    <strong>Sources:</strong>
                    <ul className="sources-list">
                      {topic.sources.map((source, index) => (
                        <li key={index}>
                          <strong>{source.label}</strong>
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              {source.url}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!editing && (
            <>
              <button className="btn" onClick={() => setEditing(true)}>Edit Topic</button>
              <button className="btn ghost danger" onClick={handleDelete}>Delete Topic</button>
            </>
          )}
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
