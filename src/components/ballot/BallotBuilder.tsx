import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { ElectionInfoForm } from './ElectionInfoForm';
import { OfficeSelector } from './OfficeSelector';
import { MeasureSelector } from './MeasureSelector';
import { BallotPreview } from './BallotPreview';
import type { ElectionInfo } from '../../schema';

export const BallotBuilder: React.FC = () => {
  const { 
    currentBallot, 
    createBallot, 
    updateBallotTitle,
    setBallotMode 
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'election' | 'offices' | 'measures' | 'preview'>('election');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = {
    election: useRef<HTMLButtonElement>(null),
    offices: useRef<HTMLButtonElement>(null),
    measures: useRef<HTMLButtonElement>(null),
    preview: useRef<HTMLButtonElement>(null),
  } as const;

  // When active tab changes, ensure it's scrolled into view (centered) on mobile
  useEffect(() => {
    const el = tabRefs[activeTab].current;
    if (el && tabsContainerRef.current) {
      try {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch {
        // Fallback manual centering
        const c = tabsContainerRef.current;
        const rect = el.getBoundingClientRect();
        const cRect = c.getBoundingClientRect();
        const delta = rect.left - cRect.left - (cRect.width / 2 - rect.width / 2);
        c.scrollLeft += delta;
      }
    }
  }, [activeTab]);

  // Listen for external requests to open Preview tab
  useEffect(() => {
    const openPreview = () => setActiveTab('preview');
    window.addEventListener('vt-open-ballot-preview', openPreview as EventListener);
    return () => window.removeEventListener('vt-open-ballot-preview', openPreview as EventListener);
  }, []);

  const handleCreateBallot = (electionInfo: ElectionInfo) => {
    createBallot(electionInfo);
    setActiveTab('offices');
  };

  const handleTitleChange = (title: string) => {
    updateBallotTitle(title);
  };

  if (!currentBallot) {
    return (
      <div className="ballot-builder">
        <div className="ballot-header">
          <h1>Create Sample Ballot</h1>
          <p>Build a sample ballot based on your preferences</p>
        </div>
        
        <div className="ballot-setup">
          <ElectionInfoForm onSubmit={handleCreateBallot} />
        </div>
      </div>
    );
  }

  return (
    <div className="ballot-builder">
      <div className="ballot-header">
        <div className="ballot-header-main">
          <h1>Sample Ballot Builder</h1>
          <div className="ballot-title">
            <input
              type="text"
              value={currentBallot.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="ballot-title-input"
              placeholder="Ballot title"
            />
          </div>
          <div className="ballot-election-info">
            <span className="election-name">{currentBallot.election.name}</span>
            <span className="election-date">{currentBallot.election.date}</span>
            <span className="election-location">{currentBallot.election.location}</span>
          </div>
        </div>
        
        <div className="ballot-actions">
          <button 
            onClick={() => setBallotMode('preference')}
            className="btn ghost"
          >
            ← Back to Preferences
          </button>
        </div>
      </div>

      <div className="ballot-tabs" ref={tabsContainerRef}>
        <button
          ref={tabRefs.election}
          className={`tab ${activeTab === 'election' ? 'active' : ''}`}
          onClick={() => setActiveTab('election')}
        >
          Election Info
        </button>
        <button
          ref={tabRefs.offices}
          className={`tab ${activeTab === 'offices' ? 'active' : ''}`}
          onClick={() => setActiveTab('offices')}
        >
          Offices ({currentBallot.offices.length})
        </button>
        <button
          ref={tabRefs.measures}
          className={`tab ${activeTab === 'measures' ? 'active' : ''}`}
          onClick={() => setActiveTab('measures')}
        >
          Measures ({currentBallot.measures.length})
        </button>
        <button
          ref={tabRefs.preview}
          className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="ballot-content">
        {activeTab === 'election' && (
          <ElectionInfoForm 
            electionInfo={currentBallot.election}
            onSubmit={handleCreateBallot}
            isEditing={true}
          />
        )}
        
        {activeTab === 'offices' && (
          <OfficeSelector />
        )}
        
        {activeTab === 'measures' && (
          <MeasureSelector />
        )}
        
        {activeTab === 'preview' && (
          <BallotPreview />
        )}
      </div>
    </div>
  );
};
