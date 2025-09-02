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

  // Set up expand/collapse button handler (other buttons are wired in main.tsx)
  useEffect(() => {
    const btnExpandAll = document.getElementById('btn-expand-all');
    
    if (btnExpandAll) {
      btnExpandAll.onclick = () => {
        if (showCards) {
          topicCardsRef.current?.toggleExpanded();
          topicCardsRef.current?.updateButtonText();
        } else {
          topicListRef.current?.toggleAll();
          topicListRef.current?.updateButtonText();
        }
      };
    }
  }, [showCards]);

  // Set up form inputs once on mount
  useEffect(() => {
    const titleEl = document.getElementById('tpl-title') as HTMLInputElement;
    const notesEl = document.getElementById('tpl-notes') as HTMLTextAreaElement;
    
    if (titleEl) {
      titleEl.value = title || '';
      titleEl.oninput = (e) => setTitle((e.target as HTMLInputElement).value);
    }
    
    if (notesEl) {
      notesEl.value = notes || '';
      notesEl.oninput = (e) => setNotes((e.target as HTMLTextAreaElement).value);
    }
  }, [title, notes, setTitle, setNotes]);

  // Add view toggle and diff comparison buttons to the toolbar (only once on mount)
  useEffect(() => {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('btn-toggle-view')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'btn-toggle-view';
      toggleBtn.className = 'btn';
      toggleBtn.textContent = 'Show Card View';
      
      const diffBtn = document.createElement('button');
      diffBtn.id = 'btn-diff-comparison';
      diffBtn.className = 'btn';
      diffBtn.textContent = 'Compare Preference Sets';
      
      const ballotBtn = document.createElement('button');
      ballotBtn.id = 'btn-ballot-mode';
      ballotBtn.className = 'btn';
      ballotBtn.textContent = 'Create Ballot';
      
      const llmBtn = document.createElement('button');
      llmBtn.id = 'btn-llm-integration';
      llmBtn.className = 'btn';
      llmBtn.textContent = 'LLM Integration';
      
      // Insert after the first button
      const firstBtn = toolbar.querySelector('.btn');
      if (firstBtn) {
        firstBtn.parentNode?.insertBefore(toggleBtn, firstBtn.nextSibling);
        firstBtn.parentNode?.insertBefore(diffBtn, toggleBtn.nextSibling);
        firstBtn.parentNode?.insertBefore(ballotBtn, diffBtn.nextSibling);
        firstBtn.parentNode?.insertBefore(llmBtn, ballotBtn.nextSibling);
      } else {
        toolbar.appendChild(toggleBtn);
        toolbar.appendChild(diffBtn);
        toolbar.appendChild(ballotBtn);
        toolbar.appendChild(llmBtn);
      }
    }
  }, []); // Only run once on mount

  // Update button text and handler when showCards or showDiffComparison changes
  useEffect(() => {
    const toggleBtn = document.getElementById('btn-toggle-view');
    if (toggleBtn) {
      if (showDiffComparison || showLLMIntegration || ballotMode === 'ballot') {
        // When in any special view, show "Back to Main View"
        toggleBtn.textContent = 'Back to Main View';
        toggleBtn.onclick = () => {
          setShowDiffComparison(false);
          setShowLLMIntegration(false);
          setBallotMode('preference');
        };
      } else {
        // When in main view, show the normal toggle
        toggleBtn.textContent = showCards ? 'Show List View' : 'Show Card View';
        toggleBtn.onclick = () => setShowCards(!showCards);
      }
    }
    
    const diffBtn = document.getElementById('btn-diff-comparison');
    if (diffBtn) {
      if (showDiffComparison) {
        // When in diff comparison view, show "Close Comparison"
        diffBtn.textContent = 'Close Comparison';
        diffBtn.onclick = () => setShowDiffComparison(false);
      } else {
        // When in main view, show "Compare Preference Sets"
        diffBtn.textContent = 'Compare Preference Sets';
        diffBtn.onclick = () => setShowDiffComparison(true);
      }
    }
    
    const ballotBtn = document.getElementById('btn-ballot-mode');
    if (ballotBtn) {
      if (ballotMode === 'ballot') {
        ballotBtn.textContent = 'Back to Preferences';
        ballotBtn.onclick = () => setBallotMode('preference');
      } else {
        ballotBtn.textContent = 'Create Ballot';
        ballotBtn.onclick = () => setBallotMode('ballot');
      }
    }
    
    const llmBtn = document.getElementById('btn-llm-integration');
    if (llmBtn) {
      if (showLLMIntegration) {
        llmBtn.textContent = 'Close LLM Integration';
        llmBtn.onclick = () => setShowLLMIntegration(false);
      } else {
        llmBtn.textContent = 'LLM Integration';
        llmBtn.onclick = () => setShowLLMIntegration(true);
      }
    }
    
    // Update expand all button text when switching views
    const btnExpandAll = document.getElementById('btn-expand-all');
    if (btnExpandAll) {
      // Update button text based on current view state
      if (showCards && topicCardsRef.current) {
        // In card view, get the current expanded state
        setTimeout(() => topicCardsRef.current?.updateButtonText(), 100);
      } else if (!showCards && topicListRef.current) {
        // In list view, get the current expanded state
        setTimeout(() => topicListRef.current?.updateButtonText(), 100);
      }
    }
  }, [showCards, showDiffComparison, showLLMIntegration, ballotMode]);

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

  // Render the appropriate view based on state
  if (showDiffComparison) {
    return (
      <PreferenceSetComparison onClose={() => setShowDiffComparison(false)} />
    );
  }

  if (showLLMIntegration) {
    return (
      <LLMIntegration />
    );
  }

  if (ballotMode === 'ballot') {
    return (
      <BallotBuilder />
    );
  }

  return (
    <>
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

      {/* Modal (available in both views) */}
      <TopicModal
        topic={selectedTopic}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleTopicSave}
        onDelete={handleTopicDelete}
      />
    </>
  );
};