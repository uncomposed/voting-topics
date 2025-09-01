import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { exportJSON, exportPDF, exportJPEG } from './exporters';
import { TemplateSchema } from './schema';
import { TopicCards } from './components/TopicCards';
import { TopicModal } from './components/TopicModal';
import { Topic } from './schema';

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
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const privacyLink = document.getElementById('privacy-link');

    if (btnNewTopic) {
      btnNewTopic.onclick = () => {
        // Create topic at the top with no stars (importance 0)
        addTopic(0);
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
            const parsed = TemplateSchema.parse(obj);
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

  // Render topics into the existing HTML structure ONLY when in list view
  useEffect(() => {
    // Only render list view when showCards is false
    if (showCards) {
      // Hide list view when in card mode
      const topicListEl = document.getElementById('topic-list');
      const emptyEl = document.getElementById('empty');
      if (topicListEl) topicListEl.hidden = true;
      if (emptyEl) emptyEl.hidden = true;
      return;
    }

    const topicListEl = document.getElementById('topic-list');
    const emptyEl = document.getElementById('empty');
    
    if (!topicListEl || !emptyEl) return;
    
    if (topics.length === 0) {
      topicListEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }
    
    topicListEl.hidden = false;
    emptyEl.hidden = true;
    
    // Smart DOM update: only recreate what's necessary
    const currentTopicIds = Array.from(topicListEl.children).map(el => el.getAttribute('data-topic-id'));
    const newTopicIds = topics.map(t => t.id);
    
    // Check if we need to re-render (only if topic structure changed)
    const needsRerender = currentTopicIds.length !== newTopicIds.length || 
                         !currentTopicIds.every((id, index) => id === newTopicIds[index]);
    
    if (!needsRerender) {
      // Just update existing input values without recreating DOM
      topics.forEach(topic => {
        const existingTopic = topicListEl.querySelector(`[data-topic-id="${topic.id}"]`);
        if (existingTopic) {
          // Update input values without recreating elements
          const titleInput = existingTopic.querySelector('input[data-field="title"]') as HTMLInputElement;
          const notesTextarea = existingTopic.querySelector('textarea[data-field="notes"]') as HTMLTextAreaElement;
          const customInput = existingTopic.querySelector('input[data-field="direction-custom"]') as HTMLInputElement;
          
          if (titleInput && titleInput.value !== topic.title) {
            titleInput.value = topic.title || '';
          }
          if (notesTextarea && notesTextarea.value !== topic.notes) {
            notesTextarea.value = topic.notes || '';
          }
          if (customInput && customInput.value !== topic.direction.custom) {
            customInput.value = topic.direction.custom || '';
          }
          
          // Update star buttons
          const starButtons = existingTopic.querySelectorAll('.star-btn');
          starButtons.forEach((btn, index) => {
            const button = btn as HTMLButtonElement;
            const isActive = index === topic.importance;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive.toString());
          });
          
          // Update direction selects
          const modeSelect = existingTopic.querySelector('select[data-field="mode"]') as HTMLSelectElement;
          const scaleSelect = existingTopic.querySelector('select[data-field="direction-scale"]') as HTMLSelectElement;
          
          if (modeSelect && modeSelect.value !== topic.mode) {
            modeSelect.value = topic.mode;
          }
          if (scaleSelect && scaleSelect.value !== String(topic.direction.scale)) {
            scaleSelect.value = String(topic.direction.scale);
          }
          
          return; // Skip to next topic
        }
        
        // If topic doesn't exist, create it
        const topicElement = document.createElement('div');
        topicElement.className = 'topic';
        topicElement.setAttribute('data-topic-id', topic.id);
        topicElement.setAttribute('aria-label', `Topic ${topic.title || topic.id}`);
        
        topicElement.innerHTML = `
          <div class="topic-header">
            <div>
              <input
                class="input"
                placeholder="Topic title (e.g., School Bond Measure)"
                value="${topic.title || ''}"
                aria-label="Topic title"
                data-topic-id="${topic.id}"
                data-field="title"
              />
            </div>
            <div>
              <label class="muted">Importance</label>
              <div class="stars" role="group" aria-label="Importance 0 to 5">
                ${Array.from({ length: 6 }, (_, n) => `
                  <button
                    class="star-btn ${topic.importance === n ? 'active' : ''}"
                    type="button"
                    aria-label="${n} star${n === 1 ? '' : 's'}"
                    aria-pressed="${topic.importance === n}"
                    data-value="${n}"
                    data-topic-id="${topic.id}"
                  >
                    ${n === 0 ? '–' : (n <= topic.importance ? '★' : '☆')}
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <label class="muted">Direction</label>
              <div class="row">
                <select aria-label="Direction mode" data-topic-id="${topic.id}" data-field="mode">
                  <option value="scale" ${topic.mode === 'scale' ? 'selected' : ''}>Select (For/Against)</option>
                  <option value="custom" ${topic.mode === 'custom' ? 'selected' : ''}>Freeform</option>
                </select>

                ${topic.mode === 'scale' ? `
                  <select aria-label="Direction scale" data-topic-id="${topic.id}" data-field="direction-scale">
                    <option value="-2" ${topic.direction.scale === -2 ? 'selected' : ''}>Strongly Against</option>
                    <option value="-1" ${topic.direction.scale === -1 ? 'selected' : ''}>Lean Against</option>
                    <option value="0" ${topic.direction.scale === 0 ? 'selected' : ''}>Neutral</option>
                    <option value="1" ${topic.direction.scale === 1 ? 'selected' : ''}>Lean For</option>
                    <option value="2" ${topic.direction.scale === 2 ? 'selected' : ''}>Strongly For</option>
                  </select>
                ` : `
                  <input
                    class="input"
                    placeholder="Describe your position…"
                    value="${topic.direction.custom || ''}"
                    aria-label="Direction freeform"
                    data-topic-id="${topic.id}"
                    data-field="direction-custom"
                  />
                `}
              </div>
              <div class="muted" style="margin-top:6px">
                ${topic.mode === 'scale' ? 
                  `Selected: ${['Strongly Against', 'Lean Against', 'Neutral', 'Lean For', 'Strongly For'][(topic.direction.scale ?? 0) + 2]}` : 
                  'Custom description enabled'
                }
              </div>
            </div>
          </div>

          <label>Notes
            <textarea
              placeholder="Why you feel this way; tradeoffs; personal thresholds…"
              aria-label="Notes"
              data-topic-id="${topic.id}"
              data-field="notes"
            >${topic.notes || ''}</textarea>
          </label>

          <div>
            <div class="row" style="justify-content: space-between;">
              <div class="muted">Sources (up to 5)</div>
              <button class="btn ghost" data-topic-id="${topic.id}" data-action="add-source">Add Source</button>
            </div>
            <div class="grid">
              ${topic.sources.map((source, i) => `
                <div class="row" style="align-items: center;">
                  <input class="input" placeholder="Label" value="${source.label}" aria-label="Source ${i + 1} label" data-topic-id="${topic.id}" data-source-index="${i}" data-field="label" />
                  <input class="input" placeholder="https://…" value="${source.url}" aria-label="Source ${i + 1} URL" data-topic-id="${topic.id}" data-source-index="${i}" data-field="url" />
                  <button class="btn ghost danger" aria-label="Remove source ${i + 1}" data-topic-id="${topic.id}" data-source-index="${i}" data-action="remove-source">Remove</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="row" style="justify-content: space-between;">
            <div class="muted">ID: ${topic.id}</div>
            <button class="btn ghost danger" data-topic-id="${topic.id}" data-action="delete">Delete Topic</button>
          </div>
        `;
        
        topicListEl.appendChild(topicElement);
      });
      
      // Add event listeners for the newly created topics only
      addTopicEventListeners();
    } else {
      // Full re-render needed
      topicListEl.innerHTML = '';
      topics.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic';
        topicElement.setAttribute('data-topic-id', topic.id);
        topicElement.setAttribute('aria-label', `Topic ${topic.title || topic.id}`);
        
        topicElement.innerHTML = `
          <div class="topic-header">
            <div>
              <input
                class="input"
                placeholder="Topic title (e.g., School Bond Measure)"
                value="${topic.title || ''}"
                aria-label="Topic title"
                data-topic-id="${topic.id}"
                data-field="title"
              />
            </div>
            <div>
              <label class="muted">Importance</label>
              <div class="stars" role="group" aria-label="Importance 0 to 5">
                ${Array.from({ length: 6 }, (_, n) => `
                  <button
                    class="star-btn ${topic.importance === n ? 'active' : ''}"
                    type="button"
                    aria-label="${n} star${n === 1 ? '' : 's'}"
                    aria-pressed="${topic.importance === n}"
                    data-value="${n}"
                    data-topic-id="${topic.id}"
                  >
                    ${n === 0 ? '–' : (n <= topic.importance ? '★' : '☆')}
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <label class="muted">Direction</label>
              <div class="row">
                <select aria-label="Direction mode" data-topic-id="${topic.id}" data-field="mode">
                  <option value="scale" ${topic.mode === 'scale' ? 'selected' : ''}>Select (For/Against)</option>
                  <option value="custom" ${topic.mode === 'custom' ? 'selected' : ''}>Freeform</option>
                </select>

                ${topic.mode === 'scale' ? `
                  <select aria-label="Direction scale" data-topic-id="${topic.id}" data-field="direction-scale">
                    <option value="-2" ${topic.direction.scale === -2 ? 'selected' : ''}>Strongly Against</option>
                    <option value="-1" ${topic.direction.scale === -1 ? 'selected' : ''}>Lean Against</option>
                    <option value="0" ${topic.direction.scale === 0 ? 'selected' : ''}>Neutral</option>
                    <option value="1" ${topic.direction.scale === 1 ? 'selected' : ''}>Lean For</option>
                    <option value="2" ${topic.direction.scale === 2 ? 'selected' : ''}>Strongly For</option>
                  </select>
                ` : `
                  <input
                    class="input"
                    placeholder="Describe your position…"
                    value="${topic.direction.custom || ''}"
                    aria-label="Direction freeform"
                    data-topic-id="${topic.id}"
                    data-field="direction-custom"
                  />
                `}
              </div>
              <div class="muted" style="margin-top:6px">
                ${topic.mode === 'scale' ? 
                  `Selected: ${['Strongly Against', 'Lean Against', 'Neutral', 'Lean For', 'Strongly For'][(topic.direction.scale ?? 0) + 2]}` : 
                  'Custom description enabled'
                }
              </div>
            </div>
          </div>

          <label>Notes
            <textarea
              placeholder="Why you feel this way; tradeoffs; personal thresholds…"
              aria-label="Notes"
              data-topic-id="${topic.id}"
              data-field="notes"
            >${topic.notes || ''}</textarea>
          </label>

          <div>
            <div class="row" style="justify-content: space-between;">
              <div class="muted">Sources (up to 5)</div>
              <button class="btn ghost" data-topic-id="${topic.id}" data-action="add-source">Add Source</button>
            </div>
            <div class="grid">
              ${topic.sources.map((source, i) => `
                <div class="row" style="align-items: center;">
                  <input class="input" placeholder="Label" value="${source.label}" aria-label="Source ${i + 1} label" data-topic-id="${topic.id}" data-source-index="${i}" data-field="label" />
                  <input class="input" placeholder="https://…" value="${source.url}" aria-label="Source ${i + 1} URL" data-topic-id="${topic.id}" data-source-index="${i}" data-field="url" />
                  <button class="btn ghost danger" aria-label="Remove source ${i + 1}" data-topic-id="${topic.id}" data-source-index="${i}" data-action="remove-source">Remove</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="row" style="justify-content: space-between;">
            <div class="muted">ID: ${topic.id}</div>
            <button class="btn ghost danger" data-topic-id="${topic.id}" data-action="delete">Delete Topic</button>
          </div>
        `;
        
        topicListEl.appendChild(topicElement);
      });
      
      // Add event listeners for the rendered topics
      addTopicEventListeners();
    }
  }, [topics, showCards]); // Include showCards in dependency array

  // Add event listeners for topic interactions
  const addTopicEventListeners = () => {
    // Remove existing listeners first to prevent duplicates
    document.removeEventListener('click', handleTopicAction);
    document.removeEventListener('input', handleTopicInput);
    document.removeEventListener('change', handleTopicChange);
    
    // Add new listeners
    document.addEventListener('click', handleTopicAction);
    document.addEventListener('input', handleTopicInput);
    document.addEventListener('change', handleTopicChange);
  };

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('click', handleTopicAction);
      document.removeEventListener('input', handleTopicInput);
      document.removeEventListener('change', handleTopicChange);
    };
  }, []);

  const handleTopicInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const topicId = target.getAttribute('data-topic-id');
    const field = target.getAttribute('data-field');
    const sourceIndex = target.getAttribute('data-source-index');
    
    if (!topicId || !field) return;
    
    if (sourceIndex !== null) {
      // Handle source field updates
      const topic = topics.find(t => t.id === topicId);
      if (topic) {
        const newSources = [...topic.sources];
        newSources[parseInt(sourceIndex)] = {
          ...newSources[parseInt(sourceIndex)],
          [field]: target.value
        };
        patchTopic(topicId, { sources: newSources });
      }
    } else {
      // Handle main topic field updates
      if (field === 'notes') {
        patchTopic(topicId, { notes: target.value });
      } else if (field === 'direction-custom') {
        patchTopic(topicId, { direction: { custom: target.value } });
      } else if (field === 'title') {
        patchTopic(topicId, { title: target.value });
      }
    }
  };

  const handleTopicChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const topicId = target.getAttribute('data-topic-id');
    const field = target.getAttribute('data-field');
    
    if (!topicId || !field) return;
    
    if (field === 'mode') {
      const mode = target.value as 'scale' | 'custom';
      patchTopic(topicId, { 
        mode, 
        direction: mode === 'scale' ? { scale: 0 } : { custom: '' } 
      });
    } else if (field === 'direction-scale') {
      const scaleValue = parseInt(target.value);
      if (scaleValue >= -2 && scaleValue <= 2) {
        patchTopic(topicId, { direction: { scale: scaleValue as -2 | -1 | 0 | 1 | 2 } });
      }
    }
  };

  const handleTopicAction = (e: Event) => {
    const target = e.target as HTMLElement;
    const topicId = target.getAttribute('data-topic-id');
    const action = target.getAttribute('data-action');
    
    if (!topicId) return;
    
    if (action === 'delete') {
      removeTopic(topicId);
    } else if (action === 'add-source') {
      const topic = topics.find(t => t.id === topicId);
      if (topic && topic.sources.length < 5) {
        patchTopic(topicId, {
          sources: [...topic.sources, { label: '', url: '' }]
        });
      }
    } else if (action === 'remove-source') {
      const sourceIndex = target.getAttribute('data-source-index');
      if (sourceIndex !== null) {
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
          patchTopic(topicId, {
            sources: topic.sources.filter((_, i) => i !== parseInt(sourceIndex))
          });
        }
      }
    } else if (target.classList.contains('star-btn')) {
      // Handle star button clicks
      const value = target.getAttribute('data-value');
      if (value !== null) {
        patchTopic(topicId, { importance: parseInt(value) });
      }
    }
  };

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

  // Add view toggle button to the toolbar (only once on mount)
  useEffect(() => {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('btn-toggle-view')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'btn-toggle-view';
      toggleBtn.className = 'btn';
      toggleBtn.textContent = 'Show Card View';
      toggleBtn.onclick = () => setShowCards(!showCards);
      
      // Insert after the first button
      const firstBtn = toolbar.querySelector('.btn');
      if (firstBtn) {
        firstBtn.parentNode?.insertBefore(toggleBtn, firstBtn.nextSibling);
      } else {
        toolbar.appendChild(toggleBtn);
      }
    }
  }, []); // Only run once on mount

  // Update button text when showCards changes
  useEffect(() => {
    const toggleBtn = document.getElementById('btn-toggle-view');
    if (toggleBtn) {
      toggleBtn.textContent = showCards ? 'Show List View' : 'Show Card View';
    }
  }, [showCards]);

  // Render the appropriate view
  if (showCards) {
    return (
      <>
        <TopicCards
          topics={topics}
          onReorder={handleTopicReorder}
          onTopicClick={handleTopicClick}
        />
        <TopicModal
          topic={selectedTopic}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleTopicSave}
          onDelete={handleTopicDelete}
        />
      </>
    );
  }

  // When not showing cards, render nothing - the list view is handled by DOM manipulation
  // but only when showCards is false
  return null;
};
