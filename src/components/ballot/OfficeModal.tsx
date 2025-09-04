import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import type { Office } from '../../schema';

interface Props {
  office: Office;
  isOpen: boolean;
  onClose: () => void;
}

export const OfficeModal: React.FC<Props> = ({ office, isOpen, onClose }) => {
  const updateOffice = useStore(s => s.updateOffice);
  const removeOffice = useStore(s => s.removeOffice);

  const [title, setTitle] = useState(office.title);
  const [description, setDescription] = useState(office.description || '');

  useEffect(() => {
    setTitle(office.title);
    setDescription(office.description || '');
  }, [office.id]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="panel-title">Edit Office</h3>
          <button className="btn ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Office title" />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Office description" rows={3} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn danger" onClick={() => { removeOffice(office.id); onClose(); }}>Remove Office</button>
          <button
            className="btn primary"
            onClick={() => {
              updateOffice(office.id, {
                title: title.trim() || office.title,
                description: description.trim() || undefined,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

