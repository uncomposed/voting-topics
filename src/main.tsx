import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { useStore } from './store';
import { exportJSON, exportPDF, exportJPEG } from './exporters';
import { parseIncomingTemplate } from './schema';

// Wire toolbar buttons that live outside the React root
const wireToolbar = () => {
  const state = useStore.getState();

  const byId = (id: string) => document.getElementById(id);

  const btnNewTopic = byId('btn-new-topic');
  const btnClear = byId('btn-clear');
  const btnExportJson = byId('btn-export-json');
  const btnExportPdf = byId('btn-export-pdf');
  const btnExportJpeg = byId('btn-export-jpeg');
  const btnImport = byId('btn-import');
  const fileInput = byId('file-input') as HTMLInputElement | null;
  const privacyLink = byId('privacy-link');

  if (btnNewTopic) btnNewTopic.onclick = () => state.addTopic(0);
  if (btnClear) btnClear.onclick = () => { if (confirm('Clear all data? This only affects your browser.')) state.clearAll(); };
  if (btnExportJson) btnExportJson.onclick = () => { try { exportJSON(); } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); } };
  if (btnExportPdf) btnExportPdf.onclick = () => { exportPDF().catch((e: unknown) => alert(e instanceof Error ? e.message : String(e))); };
  if (btnExportJpeg) btnExportJpeg.onclick = () => { exportJPEG().catch((e: unknown) => alert(e instanceof Error ? e.message : String(e))); };
  if (btnImport && fileInput) {
    btnImport.onclick = () => fileInput.click();
    fileInput.onchange = (ev) => {
      const input = ev.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(String(reader.result || '{}'));
          const parsed = parseIncomingTemplate(obj);
          useStore.setState({ title: parsed.title, notes: parsed.notes || '', topics: parsed.topics });
        } catch (e: unknown) {
          alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
          input.value = '';
        }
      };
      reader.readAsText(file);
    };
  }
  if (privacyLink) privacyLink.onclick = (e) => { e.preventDefault(); alert('Privacy: This app stores data only in your browser (localStorage). No accounts, no analytics, no network calls.\nDisclaimers: This is an informational tool; verify official ballot info via your local election authority.'); };
};

// Ensure toolbar is wired before mounting React
try { wireToolbar(); } catch {}

// Mount React into the visible topic container inside the static layout
const container = document.getElementById('topic-list');
if (!container) {
  throw new Error('Topic container element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
