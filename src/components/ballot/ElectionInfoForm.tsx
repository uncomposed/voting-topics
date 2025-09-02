import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { ElectionInfo } from '../../schema';

interface ElectionInfoFormProps {
  electionInfo?: ElectionInfo;
  onSubmit: (electionInfo: ElectionInfo) => void;
  isEditing?: boolean;
}

export const ElectionInfoForm: React.FC<ElectionInfoFormProps> = ({ 
  electionInfo, 
  onSubmit, 
  isEditing = false 
}) => {
  const updateBallotElection = useStore(state => state.updateBallotElection);
  
  const [formData, setFormData] = useState<ElectionInfo>({
    name: electionInfo?.name || '',
    date: electionInfo?.date || '',
    location: electionInfo?.location || '',
    type: electionInfo?.type || 'general',
    jurisdiction: electionInfo?.jurisdiction || ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ElectionInfo, string>>>({});

  useEffect(() => {
    if (electionInfo) {
      setFormData(electionInfo);
    }
  }, [electionInfo]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ElectionInfo, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Election name is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Election date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      newErrors.date = 'Date must be in YYYY-MM-DD format';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.jurisdiction.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (isEditing) {
      updateBallotElection(formData);
    } else {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof ElectionInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="election-info-form">
      <h2>{isEditing ? 'Edit Election Information' : 'Election Information'}</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="election-name">Election Name *</label>
          <input
            id="election-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={errors.name ? 'error' : ''}
            placeholder="e.g., 2024 General Election"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="election-date">Election Date *</label>
          <input
            id="election-date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className={errors.date ? 'error' : ''}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="election-location">Location *</label>
          <input
            id="election-location"
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className={errors.location ? 'error' : ''}
            placeholder="e.g., Portland, OR"
          />
          {errors.location && <span className="error-message">{errors.location}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="election-type">Election Type *</label>
          <select
            id="election-type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as ElectionInfo['type'])}
          >
            <option value="primary">Primary</option>
            <option value="general">General</option>
            <option value="special">Special</option>
            <option value="runoff">Runoff</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="election-jurisdiction">Jurisdiction *</label>
          <input
            id="election-jurisdiction"
            type="text"
            value={formData.jurisdiction}
            onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
            className={errors.jurisdiction ? 'error' : ''}
            placeholder="e.g., City of Portland, Multnomah County, Oregon"
          />
          {errors.jurisdiction && <span className="error-message">{errors.jurisdiction}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn primary">
            {isEditing ? 'Update Election Info' : 'Create Ballot'}
          </button>
        </div>
      </form>
    </div>
  );
};
