import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('store ballot actions', () => {
  beforeEach(() => {
    useStore.setState({
      title: '',
      notes: '',
      topics: [],
      ballotMode: 'preference',
      currentBallot: null,
      ballotHistory: [],
      currentFlowStep: 'starter',
      hintsEnabled: false,
      seenHints: [],
      hasSeenIntroModal: true,
    } as any);
  });

  it('creates ballot and selects candidate', () => {
    const election = { name: '2024', date: '2024-11-05', location: 'Test', type: 'general', jurisdiction: 'Test' } as any;
    useStore.getState().createBallot(election);
    let state = useStore.getState();
    expect(state.currentBallot?.election).toEqual(election);

    useStore.getState().addOffice({ title: 'Mayor', description: '', candidates: [], reasoning: [] });
    state = useStore.getState();
    const officeId = state.currentBallot!.offices[0].id;
    useStore.getState().addCandidate(officeId, { name: 'Alice', party: '', description: '', website: '', sources: [] });
    state = useStore.getState();
    const candId = state.currentBallot!.offices[0].candidates[0].id;
    useStore.getState().selectCandidate(officeId, candId);
    state = useStore.getState();
    expect(state.currentBallot!.offices[0].selectedCandidateId).toBe(candId);
    expect(state.currentBallot!.offices[0].candidates[0].score).toBe(5);
  });

  it('scores candidates using STAR voting helper', () => {
    const election = { name: '2024', date: '2024-11-05', location: 'Test', type: 'general', jurisdiction: 'Test' } as any;
    useStore.getState().createBallot(election);
    useStore.getState().addOffice({ title: 'Council', description: '', candidates: [], reasoning: [] });
    let state = useStore.getState();
    const officeId = state.currentBallot!.offices[0].id;

    useStore.getState().addCandidate(officeId, { name: 'Alice', party: '', description: '', website: '', sources: [] });
    useStore.getState().addCandidate(officeId, { name: 'Bob', party: '', description: '', website: '', sources: [] });

    state = useStore.getState();
    const first = state.currentBallot!.offices[0].candidates[0].id;
    const second = state.currentBallot!.offices[0].candidates[1].id;

    useStore.getState().setCandidateScore(officeId, first, 3);
    useStore.getState().setCandidateScore(officeId, second, 5);

    state = useStore.getState();
    const office = state.currentBallot!.offices[0];
    expect(office.candidates.find(c => c.id === first)?.score).toBe(3);
    expect(office.candidates.find(c => c.id === second)?.score).toBe(5);
    expect(office.selectedCandidateId).toBe(second);

    useStore.getState().setCandidateScore(officeId, second, 0);
    state = useStore.getState();
    expect(state.currentBallot!.offices[0].selectedCandidateId).toBe(first);
  });

  it('adds and removes measures', () => {
    const election = { name: '2024', date: '2024-11-05', location: 'Test', type: 'general', jurisdiction: 'Test' } as any;
    useStore.getState().createBallot(election);
    useStore.getState().addMeasure({ title: 'Prop 1', description: '', sources: [], reasoning: [] });
    let state = useStore.getState();
    expect(state.currentBallot!.measures.length).toBe(1);
    const id = state.currentBallot!.measures[0].id;
    useStore.getState().removeMeasure(id);
    state = useStore.getState();
    expect(state.currentBallot!.measures.length).toBe(0);
  });
});
