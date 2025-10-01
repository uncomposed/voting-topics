import type { StoreState } from './useStoreTypes';

export type StoreStateSelector = (state: StoreState) => any;
