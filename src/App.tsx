import React, { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { exportJSON, exportPDF, exportJPEG } from './exporters';
import { parseIncomingTemplate } from './schema';
import { TopicCards } from './components/TopicCards';
import { TopicModal } from './components/TopicModal';
import { TopicList } from './components/TopicList';
import { Topic } from './schema';
import { StarterPackPicker } from './components/StarterPackPicker';

export const App: React.FC = () => {
  const { 
    title, 
    notes, 
    topics, 
    setTitle, 
    setNotes, 
    addTopic, 
    removeTopic, 
    patchTopic, 
    clearAll 
  } = useStore();

  const topicListRef = useRef<{ toggleAll: () => void; updateButtonText: () => void }>(null);

  const [showCards, setShowCards] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set up button event handlers once on mount
  useEffect(() => {
    const btnNewTopic = document.getElementById('btn-new-topic');
    const btnClear = document.getElementById('btn-clear');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportJpeg = document.getElementById('btn-export-jpeg');
    const btnImport = document.getElementById('btn-import');
    const btnExpandAll = document.getElementById('btn-expand-all');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const privacyLink = document.getElementById('privacy-link');

    if (btnNewTopic) {
      btnNewTopic.onclick = () => {
        addTopic(0); // Create topic at the top with no stars
      };
    }
    
    if (btnClear) {
      btnClear.onclick = () => {
        if (confirm('Clear all data? This only affects your browser.')) clearAll();
      };
    }
    
    if (btnExportJson) {
      btnExportJson.onclick = () => {
        try { 
          exportJSON(); 
        } catch (e: unknown) { 
          const error = e instanceof Error ? e.message : String(e);
          alert(error); 
        }
      };
    }
    
    if (btnExportPdf) {
      btnExportPdf.onclick = () => {
        exportPDF().catch((e: unknown) => {
          const error = e instanceof Error ? e.message : String(e);
          alert(error);
        });
      };
    }
    
    if (btnExportJpeg) {
      btnExportJpeg.onclick = () => {
        exportJPEG().catch((e: unknown) => {
          const error = e instanceof Error ? e.message : String(e);
          alert(error);
        });
      };
    }
    
    if (btnImport && fileInput) {
      btnImport.onclick = () => fileInput.click();
      fileInput.onchange = (ev) => {
        const target = ev.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const obj = JSON.parse(String(reader.result || '{}'));
            const parsed = parseIncomingTemplate(obj);
            useStore.setState({
              title: parsed.title,
              notes: parsed.notes || '',
              topics: parsed.topics,
            });
          } catch (e: unknown) {
            const error = e instanceof Error ? e.message : String(e);
            alert('Import failed: ' + error);
          } finally {
            fileInput.value = '';
          }
        };
        reader.readAsText(file);
      };
    }
    
    if (btnExpandAll) {
      btnExpandAll.onclick = () => {
        topicListRef.current?.toggleAll();
        topicListRef.current?.updateButtonText();
      };
    }
    
    if (privacyLink) {
      privacyLink.onclick = (e) => {
        e.preventDefault();
        alert('Privacy: This app stores data only in your browser (localStorage). No accounts, no analytics, no network calls.\nDisclaimers: This is an informational tool; verify official ballot info via your local election authority.');
      };
    }
  }, [addTopic, clearAll]);

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

  // Add view toggle button to the toolbar (only once on mount)
  useEffect(() => {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('btn-toggle-view')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'btn-toggle-view';
      toggleBtn.className = 'btn';
      toggleBtn.textContent = 'Show Card View';
      
      // Insert after the first button
      const firstBtn = toolbar.querySelector('.btn');
      if (firstBtn) {
        firstBtn.parentNode?.insertBefore(toggleBtn, firstBtn.nextSibling);
      } else {
        toolbar.appendChild(toggleBtn);
      }
    }
  }, []); // Only run once on mount

  // Update button text and handler when showCards changes
  useEffect(() => {
    const toggleBtn = document.getElementById('btn-toggle-view');
    if (toggleBtn) {
      toggleBtn.textContent = showCards ? 'Show List View' : 'Show Card View';
      // Update the onclick handler to use the current showCards value
      toggleBtn.onclick = () => setShowCards(!showCards);
    }
  }, [showCards]);

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
  return (
    <>
      {/* Card View */}
      {showCards && (
        <TopicCards
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

      {/* Starter Pack Picker below lists */}
      {!showCards && (
        <StarterPackPicker />
      )}

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
