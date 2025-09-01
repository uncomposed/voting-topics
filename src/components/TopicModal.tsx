import React, { useState, useEffect } from 'react';
import { Topic } from '../schema';

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
    if (confirm('Are you sure you want to delete this topic?')) {
      onDelete(topic.id);
      onClose();
    }
  };

  const updateField = (field: keyof Topic, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateDirection = (updates: Partial<Topic['direction']>) => {
    setFormData(prev => ({
      ...prev,
      direction: { ...prev.direction, ...updates }
    }));
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
          <button className="modal-close" onClick={onClose}>×</button>
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
                <div className="stars">
                  {Array.from({ length: 6 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      className={`star-btn ${formData.importance === n ? 'active' : ''}`}
                      onClick={() => updateField('importance', n)}
                    >
                      {n === 0 ? '–' : (n <= (formData.importance || 0) ? '★' : '☆')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Direction</label>
                <div className="direction-controls">
                  <select
                    value={formData.mode || 'scale'}
                    onChange={e => {
                      const mode = e.target.value as 'scale' | 'custom';
                      updateField('mode', mode);
                      if (mode === 'scale') {
                        updateDirection({ scale: 0, custom: undefined });
                      } else {
                        updateDirection({ custom: '', scale: undefined });
                      }
                    }}
                    className="input"
                  >
                    <option value="scale">Select (For/Against)</option>
                    <option value="custom">Freeform</option>
                  </select>

                  {formData.mode === 'scale' ? (
                    <select
                      value={formData.direction?.scale ?? 0}
                      onChange={e => updateDirection({ scale: parseInt(e.target.value) as -2 | -1 | 0 | 1 | 2 })}
                      className="input"
                    >
                      <option value="-2">Strongly Against</option>
                      <option value="-1">Lean Against</option>
                      <option value="0">Neutral</option>
                      <option value="1">Lean For</option>
                      <option value="2">Strongly For</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.direction?.custom || ''}
                      onChange={e => updateDirection({ custom: e.target.value })}
                      placeholder="Describe your position..."
                      className="input"
                    />
                  )}
                </div>
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
                <div className="info-row">
                  <strong>Direction:</strong> 
                  {topic.mode === 'scale' ? (
                    <span className={`direction-badge scale-${topic.direction.scale ?? 0}`}>
                      {['Strongly Against', 'Lean Against', 'Neutral', 'Lean For', 'Strongly For'][(topic.direction.scale ?? 0) + 2]}
                    </span>
                  ) : (
                    <span className="direction-badge custom">
                      {topic.direction.custom || 'Custom'}
                    </span>
                  )}
                </div>
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
          {editing ? (
            <>
              <button className="btn" onClick={handleSave}>Save & Close</button>
              <button className="btn ghost" onClick={handleCancel}>Cancel</button>
            </>
          ) : (
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
