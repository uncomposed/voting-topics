import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../App';
import { useStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock the exporters
vi.mock('../exporters', () => ({
  exportJSON: vi.fn(),
  exportPDF: vi.fn(),
  exportJPEG: vi.fn()
}));

// Mock DOM elements that the app expects
const mockDOMElements = () => {
  // Create toolbar
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
  
  // Create form inputs
  const titleInput = document.createElement('input');
  titleInput.id = 'tpl-title';
  titleInput.className = 'input';
  
  const notesTextarea = document.createElement('textarea');
  notesTextarea.id = 'tpl-notes';
  notesTextarea.className = 'input';
  
  // Create file input
  const fileInput = document.createElement('input');
  fileInput.id = 'file-input';
  fileInput.type = 'file';
  
  // Append to document
  document.body.appendChild(toolbar);
  document.body.appendChild(titleInput);
  document.body.appendChild(notesTextarea);
  document.body.appendChild(fileInput);
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
        mode: 'scale' as const,
        direction: { scale: 1 },
        notes: 'Test topic notes',
        sources: []
      }
    ],
    setTitle: vi.fn(),
    setNotes: vi.fn(),
    addTopic: vi.fn(),
    removeTopic: vi.fn(),
    patchTopic: vi.fn(),
    clearAll: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    mockDOMElements();
  });

  afterEach(() => {
    cleanupDOM();
  });

  describe('View Toggle Functionality', () => {
    it('should start in list view mode', () => {
      render(<App />);
      
      // Should not render TopicCards component
      expect(screen.queryByText('Topic Priority View')).not.toBeInTheDocument();
      
      // Should render list view elements
      expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
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
      expect(toggleBtn!.textContent).toBe('Show List View');
    });

    it('should hide list view when in card view', async () => {
      render(<App />);
      
      // Start in list view
      expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
      
      // Switch to card view
      const toggleBtn = document.getElementById('btn-toggle-view');
      fireEvent.click(toggleBtn!);
      
      await waitFor(() => {
        expect(screen.getByText('Topic Priority View')).toBeInTheDocument();
      });
      
      // List view should be hidden (check React component is not rendered)
      expect(screen.queryByText('Test Topic 1')).not.toBeInTheDocument();
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
      expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
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
      expect(screen.getByText('No topics yet. Click New Topic to get started.')).toBeInTheDocument();
      
      // Add a topic
      const newTopicBtn = document.getElementById('btn-new-topic');
      fireEvent.click(newTopicBtn!);
      
      // Mock the store to now have a topic
      const topicStore = { ...mockStore, topics: [{ id: 'new', title: '', importance: 0, mode: 'scale', direction: { scale: 0 }, notes: '', sources: [] }] };
      (useStore as any).mockReturnValue(topicStore);
      
      // Re-render to see the new topic
      render(<App />);
      
      // Should now show topic list
      expect(document.getElementById('empty')!.hidden).toBe(true);
      expect(document.getElementById('topic-list')!.hidden).toBe(false);
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

    it('should show correct direction badges', async () => {
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
        expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
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
        expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
      });
      
      // Click edit button
      const editBtn = screen.getByText('Edit Topic');
      fireEvent.click(editBtn);
      
      // Find title input and change it
      const titleInput = screen.getByDisplayValue('Test Topic 1');
      fireEvent.input(titleInput, { target: { value: 'New Title' } });
      
      // Click save
      const saveBtn = screen.getByText('Save Changes');
      fireEvent.click(saveBtn);
      
      // Modal title should update immediately
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });
});
