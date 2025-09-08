import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMIntegration } from '../components/LLMIntegration';
import { useStore } from '../store';

vi.mock('../store', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: vi.fn()
  })
}));

describe('LLMIntegration import preview', () => {
  const mockStore = {
    // Minimal store shape used by component
    ballotMode: 'preference' as const,
    setBallotMode: vi.fn(),
    clearAll: vi.fn(),
    clearBallot: vi.fn(),
    currentBallot: null,
    title: 'My Set',
    notes: '',
    topics: [
      { id: 't1', title: 'Housing', importance: 3, stance: 'neutral' as const, directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
    ],
    __createdAt: '2024-01-01T00:00:00.000Z',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => selector(mockStore));
    (useStore as any).setState = vi.fn();
    (useStore as any).getState.mockReturnValue(mockStore);
  });

  it('shows diff preview and merges on request', async () => {
    render(<LLMIntegration />);

    // Switch to import tab
    const importTab = screen.getByRole('button', { name: /import json/i });
    fireEvent.click(importTab);

    const validPreferenceJSON = JSON.stringify({
      version: 'tsb.v1',
      title: 'Incoming',
      notes: '',
      topics: [
        { id: 't1', title: 'Housing', importance: 5, stance: 'for', directions: [
          { id: 'd1', text: 'Build more homes', stars: 4, sources: [], tags: [] },
        ], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } }
      ],
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });

    const textarea = screen.getByPlaceholderText(/paste json data here/i);
    fireEvent.change(textarea, { target: { value: validPreferenceJSON } });

    const importBtn = screen.getByRole('button', { name: /import json/i });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText(/import preview/i)).toBeInTheDocument();
    });

    // Merge
    const mergeBtn = screen.getByRole('button', { name: /merge/i });
    fireEvent.click(mergeBtn);

    expect((useStore as any).setState).toHaveBeenCalled();
  });
});

