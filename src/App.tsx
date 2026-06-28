import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { toast } from './utils/toast';
import {
  applySharedUrlToStore,
  clearSharePayloadFromCurrentUrl,
  getShareIdFromUrl,
  hasSharePayload,
} from './utils/shareActions';
import { scrollIntoViewSmart } from './utils/scroll';
import { WelcomeModal } from './components/WelcomeModal';

export const App: React.FC = () => {
  // Title/notes managed inside TemplateInfoPanel via store
  const topics = useStore(state => state.topics);
  const removeTopic = useStore(state => state.removeTopic);
  const patchTopic = useStore(state => state.patchTopic);
  const ballotMode = useStore(state => state.ballotMode);
  const setBallotMode = useStore(state => state.setBallotMode);
  const shareReview = useStore(state => state.shareReview);
  const clearShareReview = useStore(state => state.clearShareReview);

  const topicListRef = useRef<{ toggleAll: () => void; updateButtonText: () => void }>(null);
  const topicCardsRef = useRef<{ toggleExpanded: () => void; updateButtonText: () => void }>(null);
  const appliedShareIdRef = useRef<string | null>(null);

  const [showCards, setShowCards] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDiffComparison, setShowDiffComparison] = useState(false);
  const [showLLMIntegration, setShowLLMIntegration] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const setHasSeenOnboarding = useStore(state => state.setHasSeenOnboarding);
  const hasSeenIntroModal = useStore(state => state.hasSeenIntroModal);
  const setHasSeenIntroModal = useStore(state => state.setHasSeenIntroModal);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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

  useEffect(() => {
    if (!hasSeenIntroModal) {
      setShowWelcomeModal(true);
    }
  }, [hasSeenIntroModal]);

  const applyReviewUrl = useCallback((url: string) => {
    if (!hasSharePayload(url)) return null;

    const shareId = getShareIdFromUrl(url);
    if (appliedShareIdRef.current === shareId) return null;

    const result = applySharedUrlToStore(url);
    if (!result) {
      clearShareReview();
      toast.show({
        variant: 'danger',
        title: 'Shared link could not be opened',
        message: 'The link payload is missing, outdated, or malformed.',
        duration: 8000,
      });
      return null;
    }

    appliedShareIdRef.current = result.shareId;
    setShowLLMIntegration(false);
    setShowDiffComparison(false);

    if (result.kind === 'sample-ballot') {
      setBallotMode('ballot');
      toast.show({
        variant: 'success',
        title: 'Shared sample ballot opened',
        message: 'Review the choices and reasoning, then make a local copy to edit.',
        duration: 7000,
      });
      return result;
    }

    setBallotMode('preference');
    setShowCards(true);
    const undoSnapshot = result.kind === 'starter' ? result.undoSnapshot : undefined;
    toast.show({
      variant: 'success',
      title: result.kind === 'starter' ? 'Preferences applied' : 'Shared preferences opened',
      message: result.kind === 'starter'
        ? `${result.applied ?? 0} topics updated`
        : 'Review the values, then make a local copy before changing them.',
      actionLabel: undoSnapshot ? 'Undo' : undefined,
      onAction: undoSnapshot
        ? () => {
            useStore.setState(undoSnapshot);
            clearShareReview();
            clearSharePayloadFromCurrentUrl();
            appliedShareIdRef.current = null;
          }
        : undefined,
      duration: result.kind === 'starter' ? 6000 : 7000,
    });
    return result;
  }, [clearShareReview, setBallotMode]);

  useEffect(() => {
    const applyCurrentLocationShare = (promptBeforeReplace: boolean) => {
      const url = window.location.href;
      if (!hasSharePayload(url)) return;

      const shareId = getShareIdFromUrl(url);
      if (appliedShareIdRef.current === shareId) return;

      if (promptBeforeReplace) {
        const state = useStore.getState();
        const hasLocalWork = state.topics.length > 0 || state.items.length > 0 || !!state.currentBallot;
        if (hasLocalWork && !window.confirm('Open this shared link and replace the work currently loaded in this tab?')) {
          return;
        }
      }

      applyReviewUrl(url);
    };

    applyCurrentLocationShare(false);
    const onLocationChange = () => applyCurrentLocationShare(true);
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, [applyReviewUrl]);

  useEffect(() => {
    const openWelcome = () => setShowWelcomeModal(true);
    window.addEventListener('vt-open-welcome', openWelcome as EventListener);
    return () => window.removeEventListener('vt-open-welcome', openWelcome as EventListener);
  }, []);

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

  const handleMakeMyCopy = () => {
    clearShareReview();
    clearSharePayloadFromCurrentUrl();
    appliedShareIdRef.current = null;
    toast.show({
      variant: 'success',
      title: 'Local copy ready',
      message: 'Future edits are your version.',
      duration: 5000,
    });
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

  // Scroll to top when switching between different screens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showDiffComparison, showLLMIntegration, ballotMode]);

  return (
    <>
      {(() => {
        // Global view events to switch special views reliably even when Compare is open
        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          const openLlm = () => { setShowDiffComparison(false); setBallotMode('preference'); setShowLLMIntegration(true); };
          const openDiff = () => { setShowLLMIntegration(false); setBallotMode('preference'); setShowDiffComparison(true); };
          const backPrefs = () => { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('preference'); };
          const openGS = () => { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('preference'); setShowGettingStarted(true); };
          const exitSpecial = () => { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('preference'); setShowCards(false); };
          window.addEventListener('vt-open-llm', openLlm as EventListener);
          window.addEventListener('vt-open-diff', openDiff as EventListener);
          window.addEventListener('vt-back-preferences', backPrefs as EventListener);
          window.addEventListener('vt-open-getting-started', openGS as EventListener);
          window.addEventListener('vt-exit-special', exitSpecial as EventListener);
          return () => {
            window.removeEventListener('vt-open-llm', openLlm as EventListener);
            window.removeEventListener('vt-open-diff', openDiff as EventListener);
            window.removeEventListener('vt-back-preferences', backPrefs as EventListener);
            window.removeEventListener('vt-open-getting-started', openGS as EventListener);
            window.removeEventListener('vt-exit-special', exitSpecial as EventListener);
          };
        }, []);
        return null;
      })()}
      {(() => {
        // Global event: open Card View from anywhere (e.g., after Apply from Link)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          const openCards = () => { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('preference'); setShowCards(true); };
          window.addEventListener('vt-open-card-view', openCards as EventListener);
          return () => window.removeEventListener('vt-open-card-view', openCards as EventListener);
        }, []);
        return null;
      })()}
      {(() => {
        // Global event: open Comparison from anywhere
        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          const openComparison = () => { setShowLLMIntegration(false); setBallotMode('preference'); setShowDiffComparison(true); };
          window.addEventListener('vt-open-comparison', openComparison as EventListener);
          return () => window.removeEventListener('vt-open-comparison', openComparison as EventListener);
        }, []);
        return null;
      })()}
      {/* Global keyboard shortcuts: t (toggle view), b (ballot), c (compare), n (new), ? (shortcuts) */}
      {(() => {
        // Install once on mount
        // eslint-disable-next-line react-hooks/rules-of-hooks
        React.useEffect(() => {
          const onKey = (e: KeyboardEvent) => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
            const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;
            if (isTyping) return;
            switch (e.key) {
              case 't':
                if (!showDiffComparison && !showLLMIntegration && ballotMode === 'preference') {
                  setShowCards(v => !v);
                } else {
                  setShowDiffComparison(false); setShowLLMIntegration(false); setBallotMode('preference');
                }
                break;
              case 'b':
                if (ballotMode === 'ballot') setBallotMode('preference');
                else { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('ballot'); }
                break;
              case 'c':
                setShowLLMIntegration(false); setBallotMode('preference'); setShowDiffComparison(v => !v);
                break;
              case 'n': {
                const beforeFirst = useStore.getState().topics[0]?.id;
                useStore.getState().addTopic(0);
                setTimeout(() => {
                  const newFirst = useStore.getState().topics[0]?.id;
                  if (newFirst && newFirst !== beforeFirst) {
                    const target = document.querySelector(`[data-topic-id="${newFirst}"]`) as HTMLElement | null;
                    if (target) scrollIntoViewSmart(target);
                  }
                }, 0);
                break; }
              case '?':
              case '/':
                if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                  window.dispatchEvent(new Event('vt-toggle-shortcuts'));
                }
                break;
            }
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        }, []);
        return null;
      })()}
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
        onOpenWelcome={() => setShowWelcomeModal(true)}
      />
      {shareReview.active && (
        <div className="panel-header-with-controls shared-review-banner">
          <div className="panel-header-left">
            <h2 className="panel-title">
              {ballotMode === 'ballot' ? 'Review Shared Sample Ballot' : 'Review Shared Preference Set'}
            </h2>
            <p className="muted">
              {ballotMode === 'ballot'
                ? `You are reviewing ${shareReview.title ? `"${shareReview.title}"` : 'a shared sample ballot'}. Make a local copy before editing or publishing your version.`
                : `You are reviewing ${shareReview.title ? `"${shareReview.title}"` : 'a shared preference set'}. Make a local copy before editing or publishing your version.`}
            </p>
          </div>
          <div className="panel-controls">
            <button className="btn" onClick={handleMakeMyCopy}>
              Make My Copy
            </button>
          </div>
        </div>
      )}
      {/* Panel header only for list/cards views */}
      {!specialView && (
        <div className="panel-header-with-controls">
          <div className="panel-header-left">
            <h2 className="panel-title">Your Preference Set</h2>
            {showCards && (
              <p className="muted">
                Drag cards to reorder by importance. Click to edit details.
              </p>
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
        <GettingStartedGuide onClose={() => {
          setShowGettingStarted(false);
          setHasSeenOnboarding(true);
        }} />
      )}

      {showWelcomeModal && (
        <WelcomeModal
          isSharedView={shareReview.active}
          onDismiss={() => {
            setHasSeenIntroModal(true);
            setHasSeenOnboarding(true);
            setShowGettingStarted(false);
            setShowWelcomeModal(false);
          }}
          onOpenGuide={() => {
            setHasSeenIntroModal(true);
            setHasSeenOnboarding(true);
            setShowWelcomeModal(false);
            setShowGettingStarted(true);
          }}
        />
      )}

      {/* Template Info (portaled into aside area) */}
      <TemplateInfoPanel />

      {/* Mobile sticky action bar (always visible, adapts to context) */}
      <MobileActionBar
        showCards={showCards}
        onToggleView={() => setShowCards(!showCards)}
        showDiffComparison={showDiffComparison}
        showLLMIntegration={showLLMIntegration}
      />

      {/* Mobile slide-out menu */}
      <MobileMenu />
    </>
  );
};
