import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from './utils';
import type { Topic, Source, Direction, Stance, Ballot, Office, Candidate, Measure, ElectionInfo, ReasoningLink } from './schema';
import { trackEvent, setAnalyticsEnabled as setAnalyticsFlag } from './utils/analytics';

interface Store {
  // Preference set state
  title: string;
  notes: string;
  topics: Topic[];
  __createdAt?: string;
  
  // Ballot state
  ballotMode: 'preference' | 'ballot';
  currentBallot: Ballot | null;
  ballotHistory: Ballot[];
  
  // Flow state for guided user experience
  currentFlowStep: 'starter' | 'cards' | 'list' | 'complete';

  // Preference set actions
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  addTopic: (importance?: number) => void;
  addTopicByTitle: (title: string) => void;
  addTopicFromStarter: (starterTopic: { title: string; directions: Array<{ text: string }> }) => void;
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
  importData: (data: { title: string; notes: string; topics: Topic[] }) => void;
  
  // Flow actions
  setCurrentFlowStep: (step: 'starter' | 'cards' | 'list' | 'complete') => void;
  advanceFlowStep: () => void;
  
  // Ballot actions
  setBallotMode: (mode: 'preference' | 'ballot') => void;
  createBallot: (electionInfo: ElectionInfo) => void;
  updateBallotTitle: (title: string) => void;
  updateBallotElection: (electionInfo: ElectionInfo) => void;
  addOffice: (office: Omit<Office, 'id'>) => void;
  removeOffice: (officeId: string) => void;
  updateOffice: (officeId: string, patch: Partial<Office>) => void;
  addCandidate: (officeId: string, candidate: Omit<Candidate, 'id'>) => void;
  removeCandidate: (officeId: string, candidateId: string) => void;
  updateCandidate: (officeId: string, candidateId: string, patch: Partial<Candidate>) => void;
  selectCandidate: (officeId: string, candidateId: string) => void;
  addMeasure: (measure: Omit<Measure, 'id'>) => void;
  removeMeasure: (measureId: string) => void;
  updateMeasure: (measureId: string, patch: Partial<Measure>) => void;
  addReasoningLink: (officeId: string, candidateId: string, reasoning: ReasoningLink) => void;
  removeReasoningLink: (officeId: string, candidateId: string, reasoningId: string) => void;
  clearBallot: () => void;

  // Hint mode state
  hintsEnabled: boolean;
  seenHints: string[];
  setHintsEnabled: (v: boolean) => void;
  markHintSeen: (key: string) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;

  // Analytics state
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (v: boolean) => void;
  recordExport: (type: string) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Preference set state
      title: '',
      notes: '',
      topics: [],
      
      // Ballot state
      ballotMode: 'preference' as const,
      currentBallot: null,
      ballotHistory: [],
      
      // Flow state
      currentFlowStep: 'starter' as const,
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
      addTopicByTitle: (title: string) => set((state) => ({
        topics: [
          {
            id: uid(),
            title,
            importance: 0,
            stance: 'neutral' as Stance,
            directions: [],
            notes: '',
            sources: [],
            relations: { broader: [], narrower: [], related: [] }
          },
          ...state.topics,
        ]
      })),
      addTopicFromStarter: (starterTopic: { title: string; directions: Array<{ text: string }> }) => set((state) => ({
        topics: [
          {
            id: uid(),
            title: starterTopic.title,
            importance: 0,
            stance: 'neutral' as Stance,
            directions: starterTopic.directions.map(d => ({
              id: uid(),
              text: d.text,
              stars: 0, // Unrated until user decides
              sources: [],
              tags: []
            })),
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
      clearAll: () => set({ 
        title: '', 
        notes: '', 
        topics: [], 
        __createdAt: undefined,
        ballotMode: 'preference',
        currentBallot: null,
        ballotHistory: []
      }),
      importData: (data) => set({ 
        title: data.title, 
        notes: data.notes, 
        topics: data.topics,
        __createdAt: new Date().toISOString()
      }),
      
      // Flow actions
      setCurrentFlowStep: (step) => {
        trackEvent('flow_step', { step });
        set({ currentFlowStep: step });
      },
      advanceFlowStep: () => set((state) => {
        const steps: Array<'starter' | 'cards' | 'list' | 'complete'> = ['starter', 'cards', 'list', 'complete'];
        const currentIndex = steps.indexOf(state.currentFlowStep);
        const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
        const step = steps[nextIndex];
        trackEvent('flow_step', { step });
        return { currentFlowStep: step };
      }),
      
      // Ballot actions
      setBallotMode: (mode) => set({ ballotMode: mode }),
      createBallot: (electionInfo) => set(() => {
        trackEvent('ballot_created', { election: electionInfo.name });
        const now = new Date().toISOString();
        const newBallot: Ballot = {
          version: 'tsb.ballot.v1',
          title: `${electionInfo.name} - ${electionInfo.location}`,
          election: electionInfo,
          offices: [],
          measures: [],
          metadata: {
            preferenceSetId: undefined,
            notes: '',
            sources: [],
            tags: []
          },
          createdAt: now,
          updatedAt: now
        };
        return { currentBallot: newBallot };
      }),
      updateBallotTitle: (title) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          title,
          updatedAt: new Date().toISOString()
        } : null
      })),
      updateBallotElection: (electionInfo) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          election: electionInfo,
          updatedAt: new Date().toISOString()
        } : null
      })),
      addOffice: (office) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: [...state.currentBallot.offices, { ...office, id: uid() }],
          updatedAt: new Date().toISOString()
        } : null
      })),
      removeOffice: (officeId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.filter(o => o.id !== officeId),
          updatedAt: new Date().toISOString()
        } : null
      })),
      updateOffice: (officeId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? { ...o, ...patch } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      addCandidate: (officeId, candidate) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              candidates: [...o.candidates, { ...candidate, id: uid() }]
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      removeCandidate: (officeId, candidateId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              candidates: o.candidates.filter(c => c.id !== candidateId),
              selectedCandidateId: o.selectedCandidateId === candidateId ? undefined : o.selectedCandidateId
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      updateCandidate: (officeId, candidateId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              candidates: o.candidates.map(c => 
                c.id === candidateId ? { ...c, ...patch } : c
              )
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      selectCandidate: (officeId, candidateId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              selectedCandidateId: candidateId
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      addMeasure: (measure) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: [...state.currentBallot.measures, { ...measure, id: uid() }],
          updatedAt: new Date().toISOString()
        } : null
      })),
      removeMeasure: (measureId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: state.currentBallot.measures.filter(m => m.id !== measureId),
          updatedAt: new Date().toISOString()
        } : null
      })),
      updateMeasure: (measureId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: state.currentBallot.measures.map(m => 
            m.id === measureId ? { ...m, ...patch } : m
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      addReasoningLink: (officeId, _candidateId, reasoning) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              reasoning: [...o.reasoning, reasoning]
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      removeReasoningLink: (officeId, _candidateId, reasoningId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map(o => 
            o.id === officeId ? {
              ...o,
              reasoning: o.reasoning.filter(r => r.topicId !== reasoningId)
            } : o
          ),
          updatedAt: new Date().toISOString()
        } : null
      })),
      clearBallot: () => set({ currentBallot: null }),

      // Hints
      hintsEnabled: true,
      seenHints: [],
      setHintsEnabled: (v: boolean) => set({ hintsEnabled: v }),
      markHintSeen: (key: string) => set((state) => (
        state.seenHints.includes(key) ? state : { seenHints: [...state.seenHints, key] }
      )),
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v: boolean) => set({ hasSeenOnboarding: v }),
      analyticsEnabled: new URLSearchParams(window.location.search).get('telemetry') === '1',
      setAnalyticsEnabled: (v: boolean) => {
        setAnalyticsFlag(v);
        set({ analyticsEnabled: v });
      },
      recordExport: (type: string) => {
        trackEvent('export', { type });
      },
    }),
    { name: 'vt.m1' }
  )
);

setAnalyticsFlag(useStore.getState().analyticsEnabled);
