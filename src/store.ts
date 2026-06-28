import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from './utils';
import type {
  Topic,
  Source,
  Item,
  Direction,
  Stance,
  Ballot,
  Office,
  Candidate,
  Measure,
  ElectionInfo,
  ReasoningLink,
} from './schema';
import { hydrateTopicsWithItems, stripTopicDirections } from './schema';
import { trackEvent, setAnalyticsEnabled as setAnalyticsFlag } from './utils/analytics';

const clampScore = (score: number) => Math.max(0, Math.min(5, Math.round(score)));

const findTopCandidateId = (candidates: Candidate[]): string | undefined => {
  let topScore = -1;
  let topId: string | undefined;
  for (const candidate of candidates) {
    const score = candidate.score ?? 0;
    if (score > topScore) {
      topScore = score;
      topId = score > 0 ? candidate.id : undefined;
    }
  }
  return topId;
};

type CandidateInput = Omit<Candidate, 'id' | 'score'> & { score?: number; id?: string };
type OfficeInput = Omit<Office, 'id' | 'candidates'> & { candidates: CandidateInput[] };

interface StarterTopicInput {
  id?: string;
  title: string;
  items?: Array<{ id?: string; text: string; topicIds?: string[] }>;
  directions?: Array<{ id?: string; text: string; topicIds?: string[] }>;
}

interface Store {
  title: string;
  notes: string;
  topics: Topic[];
  items: Item[];
  __createdAt?: string;

  ballotMode: 'preference' | 'ballot';
  currentBallot: Ballot | null;
  ballotHistory: Ballot[];

  currentFlowStep: 'starter' | 'cards' | 'list' | 'complete';
  hasSeenIntroModal: boolean;

  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  addTopic: (importance?: number) => void;
  addTopicByTitle: (title: string) => void;
  addTopicFromStarter: (starterTopic: StarterTopicInput) => void;
  removeTopic: (id: string) => void;
  patchTopic: (id: string, patch: Partial<Topic>) => void;
  patchSource: (id: string, idx: number, patch: Partial<Source>) => void;
  addSource: (id: string) => void;
  removeSource: (id: string, idx: number) => void;
  addItem: (topicId: string, text?: string) => void;
  removeItem: (itemId: string) => void;
  patchItem: (itemId: string, patch: Partial<Item>) => void;
  tagItemToTopic: (itemId: string, topicId: string) => void;
  untagItemFromTopic: (itemId: string, topicId: string) => void;
  addDirection: (topicId: string) => void;
  removeDirection: (topicId: string, directionId: string) => void;
  patchDirection: (topicId: string, directionId: string, patch: Partial<Direction>) => void;
  clearAll: () => void;
  importData: (data: { title: string; notes: string; topics: Topic[]; items?: Item[] }) => void;

  setCurrentFlowStep: (step: 'starter' | 'cards' | 'list' | 'complete') => void;
  advanceFlowStep: () => void;

  setBallotMode: (mode: 'preference' | 'ballot') => void;
  createBallot: (electionInfo: ElectionInfo) => void;
  updateBallotTitle: (title: string) => void;
  updateBallotElection: (electionInfo: ElectionInfo) => void;
  addOffice: (office: OfficeInput) => void;
  removeOffice: (officeId: string) => void;
  updateOffice: (officeId: string, patch: Partial<Office>) => void;
  addCandidate: (officeId: string, candidate: CandidateInput) => void;
  removeCandidate: (officeId: string, candidateId: string) => void;
  updateCandidate: (officeId: string, candidateId: string, patch: Partial<Candidate>) => void;
  selectCandidate: (officeId: string, candidateId: string) => void;
  setCandidateScore: (officeId: string, candidateId: string, score: number) => void;
  addMeasure: (measure: Omit<Measure, 'id'>) => void;
  removeMeasure: (measureId: string) => void;
  updateMeasure: (measureId: string, patch: Partial<Measure>) => void;
  addReasoningLink: (officeId: string, candidateId: string, reasoning: ReasoningLink) => void;
  removeReasoningLink: (officeId: string, candidateId: string, reasoningId: string) => void;
  clearBallot: () => void;

  hintsEnabled: boolean;
  seenHints: string[];
  setHintsEnabled: (v: boolean) => void;
  markHintSeen: (key: string) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;
  setHasSeenIntroModal: (v: boolean) => void;

  analyticsEnabled: boolean;
  setAnalyticsEnabled: (v: boolean) => void;
  recordExport: (type: string) => void;
}

const removeDirectionsFromTopicPatch = (patch: Partial<Topic>): Partial<Topic> => {
  const rest = { ...patch };
  delete rest.directions;
  return rest;
};

const syncTopics = (topics: Topic[], items: Item[]): Topic[] => hydrateTopicsWithItems(
  topics.map(stripTopicDirections),
  items,
);

export const useStore = create<Store>()(
  persist(
    (set) => ({
      title: '',
      notes: '',
      topics: [],
      items: [],

      ballotMode: 'preference' as const,
      currentBallot: null,
      ballotHistory: [],

      currentFlowStep: 'starter' as const,
      hasSeenIntroModal: false,

      setTitle: (title) => set({ title }),
      setNotes: (notes) => set({ notes }),
      addTopic: (importance = 0) => set((state) => ({
        topics: syncTopics([{
          id: uid(),
          title: '',
          importance,
          stance: 'neutral' as Stance,
          notes: '',
          sources: [],
          relations: { broader: [], narrower: [], related: [] },
        }, ...state.topics], state.items),
      })),
      addTopicByTitle: (title) => set((state) => ({
        topics: syncTopics([{
          id: uid(),
          title,
          importance: 0,
          stance: 'neutral' as Stance,
          notes: '',
          sources: [],
          relations: { broader: [], narrower: [], related: [] },
        }, ...state.topics], state.items),
      })),
      addTopicFromStarter: (starterTopic) => set((state) => {
        const topicId = starterTopic.id ?? uid();
        const sourceItems = starterTopic.items ?? starterTopic.directions ?? [];
        const items = [...state.items];

        sourceItems.forEach((starterItem) => {
          const starterTopicIds = starterItem.topicIds?.length
            ? starterItem.topicIds
            : [topicId];
          const nextTopicIds = Array.from(new Set([...starterTopicIds, topicId]));
          const existingIdx = items.findIndex((item) => item.id === starterItem.id);

          if (existingIdx >= 0) {
            items[existingIdx] = {
              ...items[existingIdx],
              text: items[existingIdx].text || starterItem.text,
              topicIds: Array.from(new Set([...(items[existingIdx].topicIds || []), ...nextTopicIds])),
            };
            return;
          }

          items.push({
            id: starterItem.id ?? uid(),
            text: starterItem.text,
            stars: 0,
            notes: '',
            sources: [],
            topicIds: nextTopicIds,
            tags: [],
          });
        });

        const topicExists = state.topics.some((topic) =>
          topic.id === topicId || topic.title.trim().toLowerCase() === starterTopic.title.trim().toLowerCase(),
        );
        const nextTopics = topicExists
          ? state.topics
          : [{
              id: topicId,
              title: starterTopic.title,
              importance: 0,
              stance: 'neutral' as Stance,
              notes: '',
              sources: [],
              relations: { broader: [], narrower: [], related: [] },
            }, ...state.topics];
        const topics = syncTopics(nextTopics, items);
        return {
          topics,
          items,
        };
      }),
      removeTopic: (id) => set((state) => {
        const items = state.items.map((item) => ({
          ...item,
          topicIds: item.topicIds.filter((topicId) => topicId !== id),
        }));
        const topics = syncTopics(state.topics.filter((topic) => topic.id !== id), items);
        return { topics, items };
      }),
      patchTopic: (id, patch) => set((state) => ({
        topics: syncTopics(state.topics.map((topic) => topic.id === id ? { ...topic, ...removeDirectionsFromTopicPatch(patch) } : topic), state.items),
      })),
      patchSource: (id, idx, patch) => set((state) => {
        const topics = state.topics.map((topic) => {
          if (topic.id !== id) return topic;
          const next = [...topic.sources];
          next[idx] = { ...next[idx], ...patch };
          return { ...topic, sources: next };
        });
        return { topics: syncTopics(topics, state.items) };
      }),
      addSource: (id) => set((state) => ({
        topics: syncTopics(state.topics.map((topic) => topic.id === id ? { ...topic, sources: [...topic.sources, { label: '', url: '' }] } : topic), state.items),
      })),
      removeSource: (id, idx) => set((state) => ({
        topics: syncTopics(state.topics.map((topic) => topic.id === id ? { ...topic, sources: topic.sources.filter((_, i) => idx !== i) } : topic), state.items),
      })),
      addItem: (topicId, text = '') => set((state) => {
        const items = [{
          id: uid(),
          text,
          stars: 0,
          notes: '',
          sources: [],
          topicIds: [topicId],
          tags: [],
        }, ...state.items];
        return { items, topics: syncTopics(state.topics, items) };
      }),
      removeItem: (itemId) => set((state) => {
        const items = state.items.filter((item) => item.id !== itemId);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      patchItem: (itemId, patch) => set((state) => {
        const items = state.items.map((item) => item.id === itemId ? { ...item, ...patch } : item);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      tagItemToTopic: (itemId, topicId) => set((state) => {
        const items = state.items.map((item) => item.id === itemId
          ? { ...item, topicIds: item.topicIds.includes(topicId) ? item.topicIds : [...item.topicIds, topicId] }
          : item);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      untagItemFromTopic: (itemId, topicId) => set((state) => {
        const items = state.items.map((item) => item.id === itemId
          ? { ...item, topicIds: item.topicIds.filter((id) => id !== topicId) }
          : item);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      // Backward-compatible aliases while the UI finishes moving to item terminology.
      addDirection: (topicId) => set((state) => {
        const items = [{
          id: uid(),
          text: '',
          stars: 0,
          notes: '',
          sources: [],
          topicIds: [topicId],
          tags: [],
        }, ...state.items];
        return { items, topics: syncTopics(state.topics, items) };
      }),
      removeDirection: (_topicId, directionId) => set((state) => {
        const items = state.items.filter((item) => item.id !== directionId);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      patchDirection: (_topicId, directionId, patch) => set((state) => {
        const items = state.items.map((item) => item.id === directionId ? { ...item, ...patch } : item);
        return { items, topics: syncTopics(state.topics, items) };
      }),
      clearAll: () => set({
        title: '',
        notes: '',
        topics: [],
        items: [],
        __createdAt: undefined,
        ballotMode: 'preference',
        currentBallot: null,
        ballotHistory: [],
      }),
      importData: (data) => set({
        title: data.title,
        notes: data.notes,
        topics: syncTopics(data.topics, data.items ?? []),
        items: data.items ?? [],
        __createdAt: new Date().toISOString(),
      }),

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

      setBallotMode: (mode) => set({ ballotMode: mode }),
      createBallot: (electionInfo) => set(() => {
        trackEvent('ballot_created', { election: electionInfo.name });
        const now = new Date().toISOString();
        return {
          currentBallot: {
            version: 'tsb.ballot.v1',
            title: `${electionInfo.name} - ${electionInfo.location}`,
            election: electionInfo,
            offices: [],
            measures: [],
            metadata: {
              preferenceSetId: undefined,
              notes: '',
              sources: [],
              tags: [],
            },
            createdAt: now,
            updatedAt: now,
          },
        };
      }),
      updateBallotTitle: (title) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          title,
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      updateBallotElection: (electionInfo) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          election: electionInfo,
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      addOffice: (office) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: [...state.currentBallot.offices, (() => {
            const normalizedCandidates = (office.candidates ?? []).map((candidate) => ({
              ...candidate,
              id: candidate.id ?? uid(),
              score: clampScore(candidate.score ?? 0),
            }));
            return {
              ...office,
              id: uid(),
              candidates: normalizedCandidates,
              reasoning: office.reasoning ?? [],
              selectedCandidateId: findTopCandidateId(normalizedCandidates),
            };
          })()],
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      removeOffice: (officeId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.filter((office) => office.id !== officeId),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      updateOffice: (officeId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => office.id === officeId ? { ...office, ...patch } : office),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      addCandidate: (officeId, candidate) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => {
            if (office.id !== officeId) return office;
            const newCandidate = { ...candidate, id: uid(), score: clampScore(candidate.score ?? 0) };
            const candidates = [...office.candidates, newCandidate];
            return { ...office, candidates, selectedCandidateId: findTopCandidateId(candidates) };
          }),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      removeCandidate: (officeId, candidateId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => {
            if (office.id !== officeId) return office;
            const candidates = office.candidates.filter((candidate) => candidate.id !== candidateId);
            return { ...office, candidates, selectedCandidateId: findTopCandidateId(candidates) };
          }),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      updateCandidate: (officeId, candidateId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => office.id === officeId
            ? { ...office, candidates: office.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, ...patch } : candidate) }
            : office),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      selectCandidate: (officeId, candidateId) => set((state) => {
        if (!state.currentBallot) return {};
        const offices = state.currentBallot.offices.map((office) => {
          if (office.id !== officeId) return office;
          const candidates = office.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, score: 5 } : candidate);
          return { ...office, candidates, selectedCandidateId: findTopCandidateId(candidates) };
        });
        return { currentBallot: { ...state.currentBallot, offices, updatedAt: new Date().toISOString() } };
      }),
      setCandidateScore: (officeId, candidateId, score) => set((state) => {
        if (!state.currentBallot) return {};
        const offices = state.currentBallot.offices.map((office) => {
          if (office.id !== officeId) return office;
          const candidates = office.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, score: clampScore(score) } : candidate);
          return { ...office, candidates, selectedCandidateId: findTopCandidateId(candidates) };
        });
        return { currentBallot: { ...state.currentBallot, offices, updatedAt: new Date().toISOString() } };
      }),
      addMeasure: (measure) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: [...state.currentBallot.measures, { ...measure, id: uid() }],
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      removeMeasure: (measureId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: state.currentBallot.measures.filter((measure) => measure.id !== measureId),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      updateMeasure: (measureId, patch) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          measures: state.currentBallot.measures.map((measure) => measure.id === measureId ? { ...measure, ...patch } : measure),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      addReasoningLink: (officeId, _candidateId, reasoning) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => office.id === officeId ? { ...office, reasoning: [...office.reasoning, reasoning] } : office),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      removeReasoningLink: (officeId, _candidateId, reasoningId) => set((state) => ({
        currentBallot: state.currentBallot ? {
          ...state.currentBallot,
          offices: state.currentBallot.offices.map((office) => office.id === officeId
            ? {
                ...office,
                reasoning: office.reasoning.filter((reasoning) =>
                  reasoning.itemId !== reasoningId &&
                  reasoning.topicId !== reasoningId &&
                  reasoning.directionId !== reasoningId),
              }
            : office),
          updatedAt: new Date().toISOString(),
        } : null,
      })),
      clearBallot: () => set({ currentBallot: null }),

      hintsEnabled: true,
      seenHints: [],
      setHintsEnabled: (v) => set((state) => {
        if (v === state.hintsEnabled) return {};
        if (v) return { hintsEnabled: true, seenHints: [] };
        return { hintsEnabled: false };
      }),
      markHintSeen: (key) => set((state) => state.seenHints.includes(key) ? state : { seenHints: [...state.seenHints, key] }),
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      setHasSeenIntroModal: (v) => set({ hasSeenIntroModal: v }),

      analyticsEnabled: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('telemetry') === '1',
      setAnalyticsEnabled: (v) => {
        setAnalyticsFlag(v);
        set({ analyticsEnabled: v });
      },
      recordExport: (type) => trackEvent('export', { type }),
    }),
    { name: 'vt.m2' },
  ),
);

setAnalyticsFlag(useStore.getState().analyticsEnabled);
