import type { StoreState as InternalStoreState } from './useStoreTypes';

export type StoreState = InternalStoreState;
export type StoreStateSelector = (state: StoreState) => any;
