import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from './utils';
import type { Topic, Source, Direction, Stance } from './schema';

interface Store {
  title: string;
  notes: string;
  topics: Topic[];
  __createdAt?: string;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  addTopic: (importance?: number) => void;
  removeTopic: (id: string) => void;
  patchTopic: (id: string, patch: Partial<Topic>) => void;
  patchSource: (id: string, idx: number, patch: Partial<Source>) => void;
  addSource: (id: string) => void;
  removeSource: (id: string, idx: number) => void;
  // New methods for directions
  addDirection: (topicId: string) => void;
  removeDirection: (topicId: string, directionId: string) => void;
  patchDirection: (topicId: string, directionId: string, patch: Partial<Direction>) => void;
  clearAll: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      title: '',
      notes: '',
      topics: [],
      setTitle: (title) => set({ title }),
      setNotes: (notes) => set({ notes }),
      addTopic: (importance?: number) => set((state) => ({
        topics: [
          {
            id: uid(),
            title: '',
            importance: importance || 0,
            stance: 'neutral' as Stance,
            directions: [],
            notes: '',
            sources: [],
            relations: { broader: [], narrower: [], related: [] }
          },
          ...state.topics,
        ]
      })),
      removeTopic: (id) => set((state) => ({ 
        topics: state.topics.filter(t => t.id !== id) 
      })),
      patchTopic: (id, patch) => set((state) => ({
        topics: state.topics.map(t => (t.id === id ? { ...t, ...patch } : t))
      })),
      patchSource: (id, idx, patch) => set((state) => ({
        topics: state.topics.map(t => {
          if (t.id !== id) return t;
          const next = [...t.sources];
          next[idx] = { ...next[idx], ...patch };
          return { ...t, sources: next };
        })
      })),
      addSource: (id) => set((state) => ({
        topics: state.topics.map(t => (t.id === id ? { ...t, sources: [...t.sources, { label: '', url: '' }] } : t))
      })),
      removeSource: (id, idx) => set((state) => ({
        topics: state.topics.map(t => (t.id === id ? { ...t, sources: t.sources.filter((_, i) => idx !== i) } : t))
      })),
      // New methods for managing directions
      addDirection: (topicId: string) => set((state) => ({
        topics: state.topics.map(t => {
          if (t.id !== topicId) return t;
          const newDirection: Direction = {
            id: uid(),
            text: '',
            stars: 0,
            sources: [],
            tags: []
          };
          return { ...t, directions: [...t.directions, newDirection] };
        })
      })),
      removeDirection: (topicId: string, directionId: string) => set((state) => ({
        topics: state.topics.map(t => {
          if (t.id !== topicId) return t;
          return { ...t, directions: t.directions.filter(d => d.id !== directionId) };
        })
      })),
      patchDirection: (topicId: string, directionId: string, patch: Partial<Direction>) => set((state) => ({
        topics: state.topics.map(t => {
          if (t.id !== topicId) return t;
          return {
            ...t,
            directions: t.directions.map(d => 
              d.id === directionId ? { ...d, ...patch } : d
            )
          };
        })
      })),
      clearAll: () => set({ title: '', notes: '', topics: [] }),
    }),
    { name: 'vt.m1' }
  )
);
