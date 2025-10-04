import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useStore } from '../store';

const getPersistApi = () => (useStore as unknown as { persist?: { rehydrate: () => Promise<void>; getOptions?: () => { name: string } } }).persist;

describe('store flow state', () => {
  const persistApi = getPersistApi();
  const storageKey = persistApi?.getOptions?.().name ?? 'vt.m1';

  beforeEach(() => {
    window.localStorage.removeItem(storageKey);
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
      hasSeenIntroModal: false,
    } as any);
  });

  afterEach(() => {
    window.localStorage.removeItem(storageKey);
    useStore.setState({ hasSeenIntroModal: false } as any);
  });

  it('initialises intro modal flag to false', () => {
    expect(useStore.getState().hasSeenIntroModal).toBe(false);
  });

  it('persists intro modal dismissal across rehydrate', async () => {
    useStore.getState().setHasSeenIntroModal(true);

    const raw = window.localStorage.getItem(storageKey);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.hasSeenIntroModal).toBe(true);

    (useStore.getState() as any).hasSeenIntroModal = false;
    expect(useStore.getState().hasSeenIntroModal).toBe(false);

    await persistApi?.rehydrate();

    expect(useStore.getState().hasSeenIntroModal).toBe(true);
  });
});
