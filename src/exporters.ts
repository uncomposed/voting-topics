import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from './store';
import { TemplateSchema, BallotSchema } from './schema';
import { nowISO, sanitize, downloadFile } from './utils';
import type { Template, Topic, Direction, Source, Ballot } from './schema';

export const buildTemplate = (): Template => {
  const state = useStore.getState();
  const tpl = {
    version: 'tsb.v1' as const,
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
    
    // New stance display
    const stanceLabels: Record<string, string> = {
      'against': 'Strongly Against',
      'lean_against': 'Lean Against', 
      'neutral': 'Neutral',
      'lean_for': 'Lean For',
      'for': 'Strongly For'
    };
    doc.text(`Stance: ${stanceLabels[t.stance] || 'Neutral'}`, margin, y); 
    y += 14;
    
    // Display directions if they exist
    if (t.directions && t.directions.length > 0) {
      y += 6;
      H('Directions', 12);
      doc.text('Directions', margin, y);
      y += 14;
      T('');
      t.directions.forEach((d: Direction, i: number) => {
        doc.text(`${i + 1}. ${d.text} (${d.stars}/5 stars)`, margin, y);
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
      ${top.map((t: Topic, i: number) => {
        // New stance display
        const stanceLabels: Record<string, string> = {
          'against': 'Strongly Against',
          'lean_against': 'Lean Against', 
          'neutral': 'Neutral',
          'lean_for': 'Lean For',
          'for': 'Strongly For'
        };
        
        const stance = stanceLabels[t.stance] || 'Neutral';
        const directionCount = t.directions ? t.directions.length : 0;
        
        return `
          <div class="row">
            <div style="font-weight:700">${i + 1}</div>
            <div>
              <div style="font-weight:600">${t.title}</div>
              <div style="font-size: 14px; color: var(--muted); margin: 4px 0;">${stance}${directionCount > 0 ? ` • ${directionCount} direction${directionCount !== 1 ? 's' : ''}` : ''}</div>
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
};

export const exportBallotPDF = async () => {
  const ballot = buildBallot();
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
      office.candidates.forEach((candidate) => {
        if (y > 760) {
          doc.addPage();
          y = margin;
        }
        
        const isSelected = office.selectedCandidateId === candidate.id;
        const prefix = isSelected ? '✓ ' : '  ';
        
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
      if (office.selectedCandidateId && office.reasoning.length > 0) {
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
};

export const renderBallotCard = (ballot: Ballot): HTMLElement => {
  const root = document.getElementById('social-card');
  if (!root) throw new Error('Social card element not found');
  
  root.innerHTML = '';
  
  const selectedOffices = ballot.offices.filter(o => o.selectedCandidateId);
  const selectedMeasures = ballot.measures.filter(m => m.position);

  const el = document.createElement('div');
  el.innerHTML = `
    <h1>${ballot.title}</h1>
    <div class="ballot-election-info">
      <div class="election-name">${ballot.election.name}</div>
      <div class="election-date">${new Date(ballot.election.date).toLocaleDateString()}</div>
      <div class="election-location">${ballot.election.location}</div>
    </div>
    <div class="ballot-summary">
      <div class="summary-item">
        <span class="summary-label">Selected Candidates:</span>
        <span class="summary-value">${selectedOffices.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Ballot Measures:</span>
        <span class="summary-value">${selectedMeasures.length}</span>
      </div>
    </div>
    <div class="ballot-selections">
      ${selectedOffices.map(office => {
        const candidate = office.candidates.find(c => c.id === office.selectedCandidateId);
        return `
          <div class="selection-item">
            <div class="office-name">${office.title}</div>
            <div class="candidate-name">✓ ${candidate?.name}${candidate?.party ? ` (${candidate.party})` : ''}</div>
          </div>
        `;
      }).join('')}
      ${selectedMeasures.map(measure => `
        <div class="selection-item">
          <div class="measure-name">${measure.title}</div>
          <div class="measure-position">${measure.position?.toUpperCase()}</div>
        </div>
      `).join('')}
    </div>
  `;
  root.appendChild(el);
  return root;
};

export const exportBallotJPEG = async () => {
  const ballot = buildBallot();
  const node = renderBallotCard(ballot);
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  canvas.toBlob((blob) => {
    if (!blob) return alert('Could not capture image.');
    const name = `${sanitize(ballot.title)}-ballot.jpg`;
    downloadFile(blob, name);
  }, 'image/jpeg', 0.95);
};
