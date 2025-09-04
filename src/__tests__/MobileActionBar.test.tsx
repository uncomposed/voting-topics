import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { useStore } from '../store';

vi.mock('../store', () => ({
  useStore: vi.fn()
}));

vi.mock('../exporters', () => ({
  exportJSON: vi.fn(),
  exportPDF: vi.fn(),
  exportJPEG: vi.fn()
}));

describe('MobileActionBar', () => {
  const mockStore = {
    title: 'Test Template',
    notes: 'Test notes',
    topics: [
      {
        id: '1',
        title: 'Test Topic 1',
        importance: 3,
        stance: 'lean_for' as const,
        directions: [],
        notes: 'Test topic notes',
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      }
    ] as import('../schema').Topic[],
    setTitle: vi.fn(),
    setNotes: vi.fn(),
    addTopic: vi.fn(),
    removeTopic: vi.fn(),
    patchTopic: vi.fn(),
    ballotMode: 'preference' as const,
    setBallotMode: vi.fn(),
    clearAll: vi.fn(),
    clearBallot: vi.fn(),
    currentBallot: null,
    setCurrentFlowStep: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => selector(mockStore));

    // Minimal DOM structure expected by App
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <button id="btn-new-topic" class="btn">New Topic</button>
      <button id="btn-clear" class="btn">Clear All</button>
      <button id="btn-export-json" class="btn">Export JSON</button>
      <button id="btn-export-pdf" class="btn">Export PDF</button>
      <button id="btn-export-jpeg" class="btn">Export JPEG</button>
      <button id="btn-import" class="btn">Import</button>
      <a id="privacy-link" href="#">Privacy</a>
    `;
    const asideContainer = document.createElement('div');
    asideContainer.id = 'template-info';
    document.body.appendChild(toolbar);
    document.body.appendChild(asideContainer);
  });

  it('renders sticky bar buttons and toggles view', async () => {
    render(<App />);

    const toggleBtn = screen.getByRole('button', { name: /toggle view/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      // Card view label exists in card header from TopicCards
      expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
    });
  });

  it('adds a new topic with importance 0', async () => {
    render(<App />);
    const newBtn = screen.getByRole('button', { name: /new topic/i });
    fireEvent.click(newBtn);
    expect(mockStore.addTopic).toHaveBeenCalledWith(0);
  });
});

