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
    useStore.getState().addCandidate(officeId, { name: 'Alice', party: '', description: '', website: '' });
    state = useStore.getState();
    const candId = state.currentBallot!.offices[0].candidates[0].id;
    useStore.getState().selectCandidate(officeId, candId);
    state = useStore.getState();
    expect(state.currentBallot!.offices[0].selectedCandidateId).toBe(candId);
  });

  it('adds and removes measures', () => {
    const election = { name: '2024', date: '2024-11-05', location: 'Test', type: 'general', jurisdiction: 'Test' } as any;
    useStore.getState().createBallot(election);
    useStore.getState().addMeasure({ title: 'Prop 1', description: '', sources: [], tags: [] });
    let state = useStore.getState();
    expect(state.currentBallot!.measures.length).toBe(1);
    const id = state.currentBallot!.measures[0].id;
    useStore.getState().removeMeasure(id);
    state = useStore.getState();
    expect(state.currentBallot!.measures.length).toBe(0);
  });
});
