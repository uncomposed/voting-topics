import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { useStore } from '../store';

vi.mock('../store', () => ({
  useStore: Object.assign(vi.fn(), { getState: vi.fn() })
}));

vi.mock('../exporters', () => ({
  exportJSON: vi.fn(),
  exportPDF: vi.fn(),
  exportJPEG: vi.fn()
}));

describe.skip('MobileActionBar', () => {
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
    (useStore as any).mockImplementation((selector?: any) => selector ? selector(mockStore) : mockStore);
    (useStore as any).getState.mockReturnValue(mockStore);

    // Minimal DOM structure expected by App
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
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
    const newBtn = document.getElementById('btn-new-topic')!;
    fireEvent.click(newBtn);
    expect(mockStore.addTopic).toHaveBeenCalledWith(0);
  });
});

