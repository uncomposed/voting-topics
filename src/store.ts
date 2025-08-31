import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from './utils';
import type { Topic, Source } from './schema';

interface Store {
  title: string;
  notes: string;
  topics: Topic[];
  __createdAt?: string;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  addTopic: () => void;
  removeTopic: (id: string) => void;
  patchTopic: (id: string, patch: Partial<Topic>) => void;
  patchSource: (id: string, idx: number, patch: Partial<Source>) => void;
  addSource: (id: string) => void;
  removeSource: (id: string, idx: number) => void;
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
      addTopic: () => set((state) => ({
        topics: [
          ...state.topics,
          {
            id: uid(),
            title: '',
            importance: 0,
            mode: 'scale',
            direction: { scale: 0 },
            notes: '',
            sources: [],
          },
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
      clearAll: () => set({ title: '', notes: '', topics: [] }),
    }),
    { name: 'vt.m1' }
  )
);
