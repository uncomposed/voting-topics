import React, { useEffect } from 'react';
import { useStore } from './store';
import { TopicList } from './components/TopicList';
import { exportJSON, exportPDF, exportJPEG } from './exporters';
import { TemplateSchema } from './schema';

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

  useEffect(() => {
    // Set up button event handlers
    const btnNewTopic = document.getElementById('btn-new-topic');
    const btnClear = document.getElementById('btn-clear');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportJpeg = document.getElementById('btn-export-jpeg');
    const btnImport = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const privacyLink = document.getElementById('privacy-link');

    if (btnNewTopic) btnNewTopic.onclick = addTopic;
    
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

  useEffect(() => {
    // Set up form inputs
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

  return (
    <TopicList
      topics={topics}
      onChange={(id, patch) => patchTopic(id, patch)}
      onDelete={(id) => removeTopic(id)}
    />
  );
};
