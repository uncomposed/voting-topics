import { useStore } from './store';
import { TemplateSchema, BallotSchema, serializePreferenceSet, stripTopicDirections } from './schema';
import { nowISO, sanitize, downloadFile } from './utils';
import type { Template, Topic, Item, Source, Ballot } from './schema';
import { getItemsForTopic } from './utils/items';

const stanceLabels: Record<string, string> = {
  against: 'Strongly Against',
  lean_against: 'Lean Against',
  neutral: 'Neutral',
  lean_for: 'Lean For',
  for: 'Strongly For',
};

const appendText = (
  parent: HTMLElement,
  tagName: keyof HTMLElementTagNameMap,
  text: string,
  className?: string,
): HTMLElement => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  el.textContent = text;
  parent.appendChild(el);
  return el;
};

export const buildTemplate = (): Template => {
  const state = useStore.getState();
  const tpl = {
    version: 'tsb.v2' as const,
    title: state.title || 'Untitled Template',
    notes: state.notes || '',
    topics: state.topics.map(stripTopicDirections),
    items: state.items,
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
  return serializePreferenceSet(parsed.data);
};

export const exportJSON = () => {
  const tpl = buildTemplate();
  const name = `${sanitize(tpl.title)}-${tpl.topics.length}t.json`;
  downloadFile(
    new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' }),
    name
  );
  useStore.getState().recordExport('json');
};

export const exportPDF = async () => {
  const tpl = buildTemplate();
  document.body.style.cursor = 'progress';
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40; 
  let y = margin;

  const H = (_text: string, size = 18) => { 
    doc.setFont('helvetica', 'bold'); 
    doc.setFontSize(size); 
  };
  const T = (_text: string, size = 11) => { 
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
    tpl.notes.split('\n').forEach((row: string) => { 
      doc.text(row, margin, y); 
      y += 14; 
    }); 
    y += 6; 
  }
  line();
  y += 12; // Add extra space after the line to prevent overlap with first topic

  tpl.topics.forEach((t: Topic, idx: number) => {
    const topicItems = getItemsForTopic(tpl.items, t.id);
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
    
    doc.text(`Stance: ${stanceLabels[t.stance] || 'Neutral'}`, margin, y); 
    y += 14;
    
    // Display directions if they exist
    if (topicItems.length > 0) {
      y += 6;
      H('Items', 12);
      doc.text('Items', margin, y);
      y += 14;
      T('');
      topicItems.forEach((item: Item, i: number) => {
        doc.text(`${i + 1}. ${item.text} (${item.stars}/5 stars)`, margin, y);
        y += 14;
        if (y > 760) {
          doc.addPage();
          y = margin;
        }
      });
      y += 6;
    }
    
    if (t.notes) { 
      t.notes.split('\n').forEach((row: string) => { 
        doc.text(row, margin, y); 
        y += 14; 
      }); 
    }
    
    if (t.sources && t.sources.length > 0) {
      y += 6; 
      H('Sources', 12); 
      doc.text('Sources', margin, y); 
      y += 14; 
      T('');
      t.sources.forEach((s: Source, i: number) => { 
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
  document.body.style.cursor = '';
  useStore.getState().recordExport('pdf');
};

export const renderSocialCard = (tpl: Template): HTMLElement => {
  const root = document.getElementById('social-card');
  if (!root) throw new Error('Social card element not found');
  
  root.replaceChildren();
  const top = [...tpl.topics]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  const el = document.createElement('div');
  appendText(el, 'h1', tpl.title);
  appendText(el, 'small', `Top ${top.length} topics by importance`);

  const list = document.createElement('div');
  list.className = 'card-list';
  top.forEach((t: Topic, i: number) => {
    const stance = stanceLabels[t.stance] || 'Neutral';
    const itemCount = getItemsForTopic(tpl.items, t.id).length;
    const row = document.createElement('div');
    row.className = 'row';

    const rank = appendText(row, 'div', String(i + 1));
    rank.style.fontWeight = '700';

    const body = document.createElement('div');
    const title = appendText(body, 'div', t.title);
    title.style.fontWeight = '600';
    const meta = appendText(
      body,
      'div',
      `${stance}${itemCount > 0 ? ` • ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}`,
    );
    meta.style.fontSize = '14px';
    meta.style.color = 'var(--muted)';
    meta.style.margin = '4px 0';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('span');
    fill.style.width = `${(t.importance / 5) * 100}%`;
    bar.appendChild(fill);
    body.appendChild(bar);
    row.appendChild(body);

    const score = appendText(row, 'div', `${t.importance}/5`);
    score.style.textAlign = 'right';

    list.appendChild(row);
  });
  el.appendChild(list);
  root.appendChild(el);
  return root;
};

export const exportJPEG = async () => {
  const tpl = buildTemplate();
  document.body.style.cursor = 'progress';
  const node = renderSocialCard(tpl);
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  canvas.toBlob((blob) => {
    if (!blob) return alert('Could not capture image.');
    const name = `${sanitize(tpl.title)}-share.jpg`;
    downloadFile(blob, name);
    useStore.getState().recordExport('jpeg');
  }, 'image/jpeg', 0.95);
  document.body.style.cursor = '';
};

// Ballot export functions
export const buildBallot = (): Ballot => {
  const state = useStore.getState();
  if (!state.currentBallot) {
    throw new Error('No ballot found');
  }
  
  const ballot = {
    ...state.currentBallot,
    updatedAt: nowISO()
  };
  
  const parsed = BallotSchema.safeParse(ballot);
  if (!parsed.success) {
    const errs = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error('Ballot validation failed:\n' + errs);
  }
  
  return parsed.data;
};

export const exportBallotJSON = () => {
  const ballot = buildBallot();
  const name = `${sanitize(ballot.title)}-ballot.json`;
  downloadFile(
    new Blob([JSON.stringify(ballot, null, 2)], { type: 'application/json' }),
    name
  );
  useStore.getState().recordExport('ballot-json');
};

export const exportBallotPDF = async () => {
  const ballot = buildBallot();
  document.body.style.cursor = 'progress';
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40; 
  let y = margin;

  const H = (_text: string, size = 18) => { 
    doc.setFont('helvetica', 'bold'); 
    doc.setFontSize(size); 
  };
  const T = (_text: string, size = 11) => { 
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(size); 
  };
  const line = () => { 
    doc.setDrawColor(38, 48, 85); 
    doc.line(margin, y, 555, y); 
    y += 8; 
  };

  // Ballot header
  H(ballot.title, 20); 
  doc.text(ballot.title, margin, y); 
  y += 24;
  
  // Election info
  H('Election Information', 16);
  doc.text('Election Information', margin, y);
  y += 20;
  
  T(`Election: ${ballot.election.name}`);
  doc.text(`Election: ${ballot.election.name}`, margin, y);
  y += 14;
  
  T(`Date: ${new Date(ballot.election.date).toLocaleDateString()}`);
  doc.text(`Date: ${new Date(ballot.election.date).toLocaleDateString()}`, margin, y);
  y += 14;
  
  T(`Location: ${ballot.election.location}`);
  doc.text(`Location: ${ballot.election.location}`, margin, y);
  y += 14;
  
  T(`Type: ${ballot.election.type.charAt(0).toUpperCase() + ballot.election.type.slice(1)} Election`);
  doc.text(`Type: ${ballot.election.type.charAt(0).toUpperCase() + ballot.election.type.slice(1)} Election`, margin, y);
  y += 14;
  
  T(`Jurisdiction: ${ballot.election.jurisdiction}`);
  doc.text(`Jurisdiction: ${ballot.election.jurisdiction}`, margin, y);
  y += 20;
  
  line();
  y += 12;

  // Offices
  if (ballot.offices.length > 0) {
    H('Offices', 16);
    doc.text('Offices', margin, y);
    y += 20;
    
    ballot.offices.forEach((office, idx) => {
      if (y > 760) { 
        doc.addPage(); 
        y = margin; 
      }
      
      H(`${idx + 1}. ${office.title}`, 14); 
      doc.text(`${idx + 1}. ${office.title}`, margin, y); 
      y += 16;
      
      if (office.description) {
        T(office.description);
        doc.text(office.description, margin, y);
        y += 14;
      }
      
      // Candidates
      const topScore = office.candidates.reduce((best, c) => Math.max(best, c.score ?? 0), 0);
      office.candidates.forEach((candidate) => {
        if (y > 760) {
          doc.addPage();
          y = margin;
        }
        
        const score = candidate.score ?? 0;
        const isTop = topScore > 0 && score === topScore;
        const prefix = `${isTop ? '★' : ' '} [${score}/5] `;
        
        T(`${prefix}${candidate.name}${candidate.party ? ` (${candidate.party})` : ''}`);
        doc.text(`${prefix}${candidate.name}${candidate.party ? ` (${candidate.party})` : ''}`, margin, y);
        y += 14;
        
        if (candidate.description) {
          T(`    ${candidate.description}`);
          doc.text(`    ${candidate.description}`, margin, y);
          y += 14;
        }
      });
      
      // Reasoning
      if (office.reasoning.length > 0) {
        y += 6;
        H('Reasoning:', 12);
        doc.text('Reasoning:', margin, y);
        y += 14;
        
        office.reasoning.forEach((reasoning) => {
          if (y > 760) {
            doc.addPage();
            y = margin;
          }
          
          T(`• ${reasoning.relevance} (Weight: ${reasoning.weight}/5)`);
          doc.text(`• ${reasoning.relevance} (Weight: ${reasoning.weight}/5)`, margin, y);
          y += 14;
        });
      }
      
      y += 10;
      line();
      y += 10;
    });
  }

  // Measures
  if (ballot.measures.length > 0) {
    H('Ballot Measures', 16);
    doc.text('Ballot Measures', margin, y);
    y += 20;
    
    ballot.measures.forEach((measure, idx) => {
      if (y > 760) { 
        doc.addPage(); 
        y = margin; 
      }
      
      H(`${idx + 1}. ${measure.title}`, 14); 
      doc.text(`${idx + 1}. ${measure.title}`, margin, y); 
      y += 16;
      
      if (measure.description) {
        T(measure.description);
        doc.text(measure.description, margin, y);
        y += 14;
      }
      
      if (measure.position) {
        T(`Your Position: ${measure.position.toUpperCase()}`);
        doc.text(`Your Position: ${measure.position.toUpperCase()}`, margin, y);
        y += 14;
      }
      
      y += 10;
      line();
      y += 10;
    });
  }

  const name = `${sanitize(ballot.title)}-ballot.pdf`;
  doc.save(name);
  document.body.style.cursor = '';
  useStore.getState().recordExport('ballot-pdf');
};

export const renderBallotCard = (ballot: Ballot): HTMLElement => {
  const root = document.getElementById('social-card');
  if (!root) throw new Error('Social card element not found');
  
  root.replaceChildren();
  
  const scoredOffices = ballot.offices.filter(o => o.candidates.some(c => (c.score ?? 0) > 0));
  const selectedMeasures = ballot.measures.filter(m => m.position);

  const el = document.createElement('div');
  appendText(el, 'h1', ballot.title);

  const election = document.createElement('div');
  election.className = 'ballot-election-info';
  appendText(election, 'div', ballot.election.name, 'election-name');
  appendText(election, 'div', new Date(ballot.election.date).toLocaleDateString(), 'election-date');
  appendText(election, 'div', ballot.election.location, 'election-location');
  el.appendChild(election);

  const summary = document.createElement('div');
  summary.className = 'ballot-summary';
  const addSummaryItem = (labelText: string, valueText: string) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    appendText(item, 'span', labelText, 'summary-label');
    appendText(item, 'span', valueText, 'summary-value');
    summary.appendChild(item);
  };
  addSummaryItem('Scored Candidates:', String(scoredOffices.length));
  addSummaryItem('Ballot Measures:', String(selectedMeasures.length));
  el.appendChild(summary);

  const selections = document.createElement('div');
  selections.className = 'ballot-selections';
  scoredOffices.forEach((office) => {
    const topScore = office.candidates.reduce((best, c) => Math.max(best, c.score ?? 0), 0);
    const candidate = office.candidates.find(c => (c.score ?? 0) === topScore);
    const item = document.createElement('div');
    item.className = 'selection-item';
    appendText(item, 'div', office.title, 'office-name');
    appendText(
      item,
      'div',
      `${topScore}/5 - ${candidate?.name || 'Unscored'}${candidate?.party ? ` (${candidate.party})` : ''}`,
      'candidate-name',
    );
    selections.appendChild(item);
  });
  selectedMeasures.forEach((measure) => {
    const item = document.createElement('div');
    item.className = 'selection-item';
    appendText(item, 'div', measure.title, 'measure-name');
    appendText(item, 'div', measure.position?.toUpperCase() || '', 'measure-position');
    selections.appendChild(item);
  });
  el.appendChild(selections);
  root.appendChild(el);
  return root;
};

export const exportBallotJPEG = async () => {
  const ballot = buildBallot();
  document.body.style.cursor = 'progress';
  const node = renderBallotCard(ballot);
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  canvas.toBlob((blob) => {
    if (!blob) return alert('Could not capture image.');
    const name = `${sanitize(ballot.title)}-ballot.jpg`;
    downloadFile(blob, name);
    useStore.getState().recordExport('ballot-jpeg');
  }, 'image/jpeg', 0.95);
  document.body.style.cursor = '';
};
