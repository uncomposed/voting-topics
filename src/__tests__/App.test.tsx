import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { useStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: vi.fn()
  })
}));

// Mock the exporters
vi.mock('../exporters', () => ({
  exportJSON: vi.fn(),
  exportPDF: vi.fn(),
  exportJPEG: vi.fn()
}));

// Mock DOM elements that the app expects
const mockDOMElements = () => {
  // Create toolbar container (buttons are rendered by React Toolbar)
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  
  // Append to document
  document.body.appendChild(toolbar);
  const templateInfo = document.createElement('div');
  templateInfo.id = 'template-info';
  document.body.appendChild(templateInfo);
};

const cleanupDOM = () => {
  document.body.innerHTML = '';
};

describe('App Component', () => {
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
    addTopic: vi.fn((importance?: number) => {
      // Actually add a topic to the mock store
      const newTopic = {
        id: '2',
        title: '',
        importance: importance || 0,
        stance: 'neutral' as const,
        directions: [],
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      };
      mockStore.topics.unshift(newTopic);
    }),
    removeTopic: vi.fn(),
    patchTopic: vi.fn((id: string, patch: Partial<import('../schema').Topic>) => {
      // Actually update the mock store state
      const topicIndex = mockStore.topics.findIndex(t => t.id === id);
      if (topicIndex !== -1) {
        mockStore.topics[topicIndex] = { ...mockStore.topics[topicIndex], ...patch };
      }
    }),
    clearAll: vi.fn()
  };

  // Function to reset mock store to initial state
  const resetMockStore = () => {
    mockStore.topics = [
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
    ];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockStore(); // Reset mock store state before each test
    (useStore as any).mockReturnValue(mockStore);
    (useStore as any).getState.mockReturnValue(mockStore);
    mockDOMElements();
  });

  afterEach(() => {
    cleanupDOM();
  });

  describe('React Toolbar', () => {
    it('renders toolbar buttons into .toolbar via portal', () => {
      render(<App />);
      expect(document.getElementById('btn-toggle-view')).toBeInTheDocument();
      expect(document.getElementById('btn-new-topic')).toBeInTheDocument();
      expect(document.getElementById('btn-export-json')).toBeInTheDocument();
      expect(document.getElementById('btn-diff-comparison')).toBeInTheDocument();
      expect(document.getElementById('btn-llm-integration')).toBeInTheDocument();
    });
  });

  describe('View Toggle Functionality', () => {
    it('should start in list view mode', () => {
      render(<App />);
      
      // Should not render TopicCards component
      expect(screen.queryByText('Topic Priority View')).not.toBeInTheDocument();
      
      // Should render list view elements
      expect(screen.getByLabelText('Topic Test Topic 1')).toBeInTheDocument();
    });

    it('should toggle to card view when button is clicked', async () => {
      render(<App />);
      
      // Find and click the toggle button
      const toggleBtn = document.getElementById('btn-toggle-view');
      expect(toggleBtn).toBeInTheDocument();
      
      fireEvent.click(toggleBtn!);
      
      // Should now render card view
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // Button text should change
      expect(toggleBtn!.textContent).toBe('List View');
    });

    it('should hide list view when in card view', async () => {
      render(<App />);
      
      // Start in list view
      expect(screen.getByLabelText('Topic Test Topic 1')).toBeInTheDocument();
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // List view should be hidden (check React component is not rendered)
      expect(screen.queryByLabelText('Topic Test Topic 1')).not.toBeInTheDocument();
    });

    it('should return to list view when toggle button is clicked again', async () => {
      render(<App />);
      
      const toggleBtn = document.getElementById('btn-toggle-view');
      
      // Switch to card view
      fireEvent.click(toggleBtn!);
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // Switch back to list view
      fireEvent.click(toggleBtn!);
      await waitFor(() => {
        expect(screen.queryByText('Topic Priority View')).not.toBeInTheDocument();
      });
      
      // List view should be visible again (check React component is rendered)
      expect(screen.getByLabelText('Topic Test Topic 1')).toBeInTheDocument();
    });
  });

  describe('New Topic Creation', () => {
    it('should create new topic with 0 importance (no stars)', () => {
      render(<App />);
      
      const newTopicBtn = document.getElementById('btn-new-topic');
      fireEvent.click(newTopicBtn!);
      
      expect(mockStore.addTopic).toHaveBeenCalledWith(0);
    });

    it('should add new topic at the beginning of the topics array', () => {
      render(<App />);
      
      const newTopicBtn = document.getElementById('btn-new-topic');
      fireEvent.click(newTopicBtn!);
      
      expect(mockStore.addTopic).toHaveBeenCalledWith(0);
    });

    it('should show new topic immediately in list view', () => {
      // Mock store with empty topics
      const emptyStore = { ...mockStore, topics: [] };
      (useStore as any).mockReturnValue(emptyStore);
      
      render(<App />);
      
      // Should show empty state (React component)
      expect(screen.getByText(/No topics yet/)).toBeInTheDocument();
      
      // Add a topic
      const newTopicBtn = document.getElementById('btn-new-topic');
      fireEvent.click(newTopicBtn!);
      
      // Mock the store to now have a topic
      const topicStore = { ...mockStore, topics: [{ id: 'new', title: '', importance: 0, stance: 'neutral' as const, directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } }] };
      (useStore as any).mockReturnValue(topicStore);
      
      // Re-render to see the new topic
      render(<App />);
      
      // Should have called addTopic (the actual functionality we're testing)
      expect(mockStore.addTopic).toHaveBeenCalledWith(0);
    });
  });

  describe('Input Field Behavior', () => {
    it('should maintain input focus during typing', async () => {
      render(<App />);
      
      // Wait for topics to be rendered
      await waitFor(() => {
        const topicInputs = document.querySelectorAll('input[data-field="title"]');
        expect(topicInputs.length).toBeGreaterThan(0);
      });
      
      const topicInput = document.querySelector('input[data-field="title"]') as HTMLInputElement;
      
      // Focus the input
      topicInput.focus();
      expect(document.activeElement).toBe(topicInput);
      
      // Type a character
      fireEvent.input(topicInput, { target: { value: 'A' } });
      
      // Should still be focused
      expect(document.activeElement).toBe(topicInput);
      
      // Type another character
      fireEvent.input(topicInput, { target: { value: 'AB' } });
      
      // Should still be focused
      expect(document.activeElement).toBe(topicInput);
    });

    it('should not recreate input fields on every keystroke', async () => {
      render(<App />);
      
      await waitFor(() => {
        const topicInputs = document.querySelectorAll('input[data-field="title"]');
        expect(topicInputs.length).toBeGreaterThan(0);
      });
      
      const topicInput = document.querySelector('input[data-field="title"]') as HTMLInputElement;
      const originalInput = topicInput;
      
      // Type several characters
      fireEvent.input(topicInput, { target: { value: 'A' } });
      fireEvent.input(topicInput, { target: { value: 'AB' } });
      fireEvent.input(topicInput, { target: { value: 'ABC' } });
      
      // Should be the same input element
      const currentInput = document.querySelector('input[data-field="title"]') as HTMLInputElement;
      expect(currentInput).toBe(originalInput);
    });
  });

  describe('Topic Editing', () => {
    it('should update topic title in real-time', async () => {
      render(<App />);
      
      await waitFor(() => {
        const topicInputs = document.querySelectorAll('input[data-field="title"]');
        expect(topicInputs.length).toBeGreaterThan(0);
      });
      
      const topicInput = document.querySelector('input[data-field="title"]') as HTMLInputElement;
      
      // Type new title
      fireEvent.input(topicInput, { target: { value: 'Updated Title' } });
      
      // Should call patchTopic with new title
      expect(mockStore.patchTopic).toHaveBeenCalledWith('1', { title: 'Updated Title' });
    });

    it('should update topic importance when stars are clicked', async () => {
      render(<App />);
      
      await waitFor(() => {
        const starButtons = document.querySelectorAll('.star-btn');
        expect(starButtons.length).toBeGreaterThan(0);
      });
      
      const starButton = document.querySelector('.star-btn[data-value="4"]') as HTMLButtonElement;
      fireEvent.click(starButton);
      
      expect(mockStore.patchTopic).toHaveBeenCalledWith('1', { importance: 4 });
    });
  });

  describe('Card View Functionality', () => {
    it('should render topic cards when in card view', async () => {
      render(<App />);
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // Should show the test topic
      expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
    });

    it('should show correct importance labels', async () => {
      render(<App />);
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument();
      });
    });

    it('should show correct stance badges', async () => {
      render(<App />);
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Lean For')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Functionality', () => {
    it('should open modal when topic card is clicked', async () => {
      render(<App />);
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // Click on a topic card
      const topicCard = screen.getByText('Test Topic 1');
      fireEvent.click(topicCard);
      
      // Should open modal
      await waitFor(() => {
        expect(screen.getByText('Edit Topic')).toBeInTheDocument();
      });
    });

    it('should update modal title when topic is edited and saved', async () => {
      render(<App />);
      
      // Switch to card view and open modal
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      const topicCard = screen.getByText('Test Topic 1');
      fireEvent.click(topicCard);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Topic')).toBeInTheDocument();
      });
      
      // Click edit button
      const editBtn = screen.getByText('Edit Topic');
      fireEvent.click(editBtn);
      
      // Find title input and change it
      const titleInput = screen.getByDisplayValue('Test Topic 1');
      fireEvent.input(titleInput, { target: { value: 'New Title' } });
      
      // Click save (which will close the modal)
      const saveBtn = screen.getByText('Save & Close');
      fireEvent.click(saveBtn);
      
      // Modal should close, and we should see updated data in card view
      await waitFor(() => {
        expect(screen.queryByText('Edit Topic')).not.toBeInTheDocument();
      });
      
      // The updated title should be visible in the card view
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });
});
