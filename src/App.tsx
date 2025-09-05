import React, { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { TopicCards } from './components/TopicCards';
import { TopicModal } from './components/TopicModal';
import { TopicList } from './components/TopicList';
import { Topic } from './schema';
import { StarterPackPicker } from './components/StarterPackPicker';
import { PreferenceSetComparison } from './components/PreferenceSetComparison';
import { BallotBuilder } from './components/ballot';
import { LLMIntegration } from './components/LLMIntegration';
import { NextStepGuidance } from './components/NextStepGuidance';
import { GettingStartedGuide } from './components/GettingStartedGuide';
import { TemplateInfoPanel } from './components/TemplateInfoPanel';
import { MobileActionBar } from './components/MobileActionBar';
import { MobileMenu } from './components/MobileMenu';
import { Toolbar } from './components/Toolbar';

export const App: React.FC = () => {
  const title = useStore(state => state.title);
  const notes = useStore(state => state.notes);
  const topics = useStore(state => state.topics);
  const setTitle = useStore(state => state.setTitle);
  const setNotes = useStore(state => state.setNotes);
  const removeTopic = useStore(state => state.removeTopic);
  const patchTopic = useStore(state => state.patchTopic);
  const ballotMode = useStore(state => state.ballotMode);
  const setBallotMode = useStore(state => state.setBallotMode);

  const topicListRef = useRef<{ toggleAll: () => void; updateButtonText: () => void }>(null);
  const topicCardsRef = useRef<{ toggleExpanded: () => void; updateButtonText: () => void }>(null);

  const [showCards, setShowCards] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDiffComparison, setShowDiffComparison] = useState(false);
  const [showLLMIntegration, setShowLLMIntegration] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  // Set up expand/collapse button handler (other buttons are wired in main.tsx)
  useEffect(() => {
    const btnExpandAll = document.getElementById('btn-expand-all');
    if (!btnExpandAll) return;
    btnExpandAll.onclick = () => {
      if (showCards) {
        // If card view just mounted, ref may not be ready on first tick
        if (!topicCardsRef.current) {
          setTimeout(() => {
            topicCardsRef.current?.toggleExpanded();
            setTimeout(() => topicCardsRef.current?.updateButtonText(), 0);
          }, 0);
          return;
        }
        topicCardsRef.current.toggleExpanded();
        setTimeout(() => topicCardsRef.current?.updateButtonText(), 0);
      } else {
        if (!topicListRef.current) {
          setTimeout(() => {
            topicListRef.current?.toggleAll();
            setTimeout(() => topicListRef.current?.updateButtonText(), 0);
          }, 0);
          return;
        }
        topicListRef.current.toggleAll();
        setTimeout(() => topicListRef.current?.updateButtonText(), 0);
      }
    };
  }, [showCards, showDiffComparison, showLLMIntegration, ballotMode]);

  // Template title/notes are now managed via React in TemplateInfoPanel

  // Toolbar is now managed by React component via portal

  // Card view handlers
  const handleTopicReorder = (topicId: string, newImportance: number) => {
    patchTopic(topicId, { importance: newImportance });
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTopic(null);
  };

  const handleTopicSave = (topicId: string, updates: Partial<Topic>) => {
    patchTopic(topicId, updates);
  };

  const handleTopicDelete = (topicId: string) => {
    removeTopic(topicId);
  };

  // Decide main content view
  let specialView: React.ReactNode = null;
  if (showDiffComparison) {
    specialView = <PreferenceSetComparison onClose={() => setShowDiffComparison(false)} />;
  } else if (showLLMIntegration) {
    specialView = <LLMIntegration />;
  } else if (ballotMode === 'ballot') {
    specialView = <BallotBuilder />;
  }

  // Sync expand button label when view switches or topics change
  useEffect(() => {
    const btn = document.getElementById('btn-expand-all');
    if (!btn) return;
    if (showDiffComparison || showLLMIntegration || ballotMode === 'ballot') return;
    if (showCards) setTimeout(() => topicCardsRef.current?.updateButtonText(), 0);
    else setTimeout(() => topicListRef.current?.updateButtonText(), 0);
  }, [showCards, topics.length, showDiffComparison, showLLMIntegration, ballotMode]);

  return (
    <>
      {/* Toolbar (portaled into header .toolbar) */}
      <Toolbar
        showCards={showCards}
        setShowCards={setShowCards}
        showDiffComparison={showDiffComparison}
        setShowDiffComparison={setShowDiffComparison}
        ballotMode={ballotMode}
        setBallotMode={setBallotMode}
        showLLMIntegration={showLLMIntegration}
        setShowLLMIntegration={setShowLLMIntegration}
        setShowGettingStarted={setShowGettingStarted}
      />
      {/* Panel header only for list/cards views */}
      {!specialView && (
        <div className="panel-header-with-controls">
          <div className="panel-header-left">
            <h2 className="panel-title">Your Topics</h2>
            {showCards && (
              <p className="muted">Drag cards to reorder by importance. Click to edit details.</p>
            )}
          </div>
          <div className="panel-controls">
            <button id="btn-expand-all" className="btn ghost">▼ Expand All</button>
          </div>
        </div>
      )}

      {specialView ? (
        specialView
      ) : (
        <>
          {/* Next Step Guidance */}
          <NextStepGuidance />

          {/* Card View */}
          {showCards && (
            <TopicCards
              ref={topicCardsRef}
              topics={topics}
              onReorder={handleTopicReorder}
              onTopicClick={handleTopicClick}
            />
          )}

          {/* List View */}
          {!showCards && (
            <TopicList
              ref={topicListRef}
              topics={topics}
              onChange={patchTopic}
              onDelete={removeTopic}
            />
          )}

          {/* Starter Pack Picker below both views */}
          <StarterPackPicker />
        </>
      )}

      {/* Modal (available in both views) */}
      <TopicModal
        topic={selectedTopic}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleTopicSave}
        onDelete={handleTopicDelete}
      />

      {/* Getting Started Guide Modal */}
      {showGettingStarted && (
        <GettingStartedGuide onClose={() => setShowGettingStarted(false)} />
      )}

      {/* Template Info (portaled into aside area) */}
      <TemplateInfoPanel />

      {/* Mobile sticky action bar (list/cards only) */}
      {!specialView && (
        <MobileActionBar
          showCards={showCards}
          onToggleView={() => setShowCards(!showCards)}
        />
      )}

      {/* Mobile slide-out menu */}
      <MobileMenu />
    </>
  );
};
