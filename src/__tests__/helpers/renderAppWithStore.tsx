import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../../App';
import { useStore } from '../../store';
import type { StoreState } from './types';
import type { Topic, Ballot } from '../../schema';

type StoreOverrides = Partial<StoreState>;

interface RenderAppOptions {
  storeOverrides?: StoreOverrides;
  topics?: Topic[];
  ballotMode?: 'preference' | 'ballot';
  currentBallot?: Ballot | null;
}

const defaultTopic: Topic = {
  id: 'topic-1',
  title: 'Housing',
  importance: 3,
  stance: 'neutral',
  directions: [],
  notes: '',
  sources: [],
  relations: { broader: [], narrower: [], related: [] },
};

const ensurePortalRoots = () => {
  const ensure = (selector: string, asClass = false) => {
    if (asClass) {
      if (!document.querySelector(`.${selector}`)) {
        const node = document.createElement('div');
        node.className = selector;
        document.body.appendChild(node);
      }
    } else {
      if (!document.getElementById(selector)) {
        const node = document.createElement('div');
        node.id = selector;
        document.body.appendChild(node);
      }
    }
  };

  ensure('template-info');
  ensure('toolbar', true);

  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
};

const wrapAction = <T extends (...args: any[]) => any>(original?: T, fallbackName?: string) => {
  if (typeof original === 'function') return original;
  const fn = vi.fn();
  Object.defineProperty(fn, 'name', { value: fallbackName ?? 'mockAction' });
  return fn as unknown as T;
};

const buildState = (base: StoreState, overrides: StoreOverrides, options: { allowEmptyTopics?: boolean } = {}): StoreState => {
  const { allowEmptyTopics = false } = options;
  const next: StoreState = {
    ...base,
    ...overrides,
  };

  const providedTopics = overrides.topics;
  next.topics = providedTopics ?? base.topics ?? [defaultTopic];
  if (!allowEmptyTopics && next.topics.length === 0) next.topics = [defaultTopic];
  next.ballotMode = overrides.ballotMode ?? base.ballotMode ?? 'preference';
  next.currentBallot = overrides.currentBallot ?? base.currentBallot ?? null;

  next.addTopic = wrapAction(overrides.addTopic ?? base.addTopic, 'addTopic');
  next.patchTopic = wrapAction(overrides.patchTopic ?? base.patchTopic, 'patchTopic');
  next.addTopicFromStarter = wrapAction(overrides.addTopicFromStarter ?? base.addTopicFromStarter, 'addTopicFromStarter');
  next.advanceFlowStep = wrapAction(overrides.advanceFlowStep ?? base.advanceFlowStep, 'advanceFlowStep');
  next.setBallotMode = wrapAction(overrides.setBallotMode ?? base.setBallotMode, 'setBallotMode');
  next.setHintsEnabled = wrapAction(overrides.setHintsEnabled ?? base.setHintsEnabled, 'setHintsEnabled');

  return next;
};

export const renderAppWithStore = (options: RenderAppOptions = {}) => {
  const {
    storeOverrides = {},
    topics,
    ballotMode,
    currentBallot,
  } = options;

  const baseState = useStore.getState();
  const nextState = buildState(baseState, {
    ...storeOverrides,
    topics: topics ?? storeOverrides.topics,
    ballotMode: ballotMode ?? storeOverrides.ballotMode,
    currentBallot: currentBallot ?? storeOverrides.currentBallot,
  }, {
    allowEmptyTopics: topics !== undefined || storeOverrides.topics !== undefined,
  });

  ensurePortalRoots();
  useStore.setState(nextState, true);

  const utils = render(<App />);

  return {
    ...utils,
    store: nextState,
    restoreStore: () => useStore.setState(baseState, true),
  };
};
