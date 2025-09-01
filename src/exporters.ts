import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from './store';
import { TemplateSchema } from './schema';
import { nowISO, sanitize, downloadFile } from './utils';
import type { Template } from './schema';

export const buildTemplate = (): Template => {
  const state = useStore.getState();
  const tpl = {
    version: 'tsb.v0' as const,
    title: state.title || 'Untitled Template',
    notes: state.notes || '',
    topics: state.topics,
    createdAt: state.__createdAt || nowISO(),
    updatedAt: nowISO(),
  };
  
  const parsed = TemplateSchema.safeParse(tpl);
  if (!parsed.success) {
    const errs = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error('Validation failed:\n' + errs);
  }
  
  // remember first creation time
  if (!state.__createdAt) useStore.setState({ __createdAt: tpl.createdAt });
  return parsed.data;
};

export const exportJSON = () => {
  const tpl = buildTemplate();
  const name = `${sanitize(tpl.title)}-${tpl.topics.length}t.json`;
  downloadFile(
    new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' }), 
    name
  );
};

export const exportPDF = async () => {
  const tpl = buildTemplate();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40; 
  let y = margin;

  const H = (text: string, size = 18) => { 
    doc.setFont('helvetica', 'bold'); 
    doc.setFontSize(size); 
  };
  const T = (text: string, size = 11) => { 
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(size); 
  };
  const line = () => { 
    doc.setDrawColor(38, 48, 85); 
    doc.line(margin, y, 555, y); 
    y += 8; 
  };

  H(tpl.title, 20); 
  doc.text(tpl.title, margin, y); 
  y += 24;
  
  T(`Generated: ${new Date().toLocaleString()}`); 
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); 
  y += 18;
  
  if (tpl.notes) { 
    T(''); 
    tpl.notes.split('\n').forEach(row => { 
      doc.text(row, margin, y); 
      y += 14; 
    }); 
    y += 6; 
  }
  line();
  y += 12; // Add extra space after the line to prevent overlap with first topic

  tpl.topics.forEach((t, idx) => {
    if (y > 760) { 
      doc.addPage(); 
      y = margin; 
    }
    H(`${idx + 1}. ${t.title}`, 14); 
    doc.text(`${idx + 1}. ${t.title}`, margin, y); 
    y += 16;
    
    T(''); 
    doc.text(`Importance: ${t.importance}/5`, margin, y); 
    y += 14;
    
    const dir = t.mode === 'scale' 
      ? ({'-2':'Strongly Against','-1':'Lean Against','0':'Neutral','1':'Lean For','2':'Strongly For'}[String(t.direction.scale ?? 0)]) 
      : (t.direction.custom || '—');
    doc.text(`Direction: ${dir}`, margin, y); 
    y += 14;
    
    if (t.notes) { 
      t.notes.split('\n').forEach(row => { 
        doc.text(row, margin, y); 
        y += 14; 
      }); 
    }
    
    if (t.sources?.length) {
      y += 6; 
      H('Sources', 12); 
      doc.text('Sources', margin, y); 
      y += 14; 
      T('');
      t.sources.forEach((s, i) => { 
        doc.text(`${i + 1}. ${s.label} — ${s.url}`, margin, y); 
        y += 14; 
        if (y > 760) { 
          doc.addPage(); 
          y = margin; 
        } 
      });
    }
    y += 10; 
    line(); 
    y += 10;
  });

  const name = `${sanitize(tpl.title)}-${tpl.topics.length}t.pdf`;
  doc.save(name);
};

export const renderSocialCard = (tpl: Template): HTMLElement => {
  const root = document.getElementById('social-card');
  if (!root) throw new Error('Social card element not found');
  
  root.innerHTML = '';
  const top = [...tpl.topics]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  const el = document.createElement('div');
  el.innerHTML = `
    <h1>${tpl.title}</h1>
    <small>Top ${top.length} topics by importance</small>
    <div class="card-list">
      ${top.map((t, i) => {
        const direction = t.mode === 'scale' 
          ? ['Strongly Against', 'Lean Against', 'Neutral', 'Lean For', 'Strongly For'][t.direction.scale + 2] || 'Neutral'
          : (t.direction.custom || '—');
        
        return `
          <div class="row">
            <div style="font-weight:700">${i + 1}</div>
            <div>
              <div style="font-weight:600">${t.title}</div>
              <div style="font-size: 14px; color: var(--muted); margin: 4px 0;">${direction}</div>
              <div class="bar"><span style="width:${(t.importance / 5) * 100}%"></span></div>
            </div>
            <div style="text-align:right">${t.importance}/5</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  root.appendChild(el);
  return root;
};

export const exportJPEG = async () => {
  const tpl = buildTemplate();
  const node = renderSocialCard(tpl);
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  canvas.toBlob((blob) => {
    if (!blob) return alert('Could not capture image.');
    const name = `${sanitize(tpl.title)}-share.jpg`;
    downloadFile(blob, name);
  }, 'image/jpeg', 0.95);
};
