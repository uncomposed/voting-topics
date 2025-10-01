import { useStore } from '../../store';

export type StoreState = ReturnType<typeof useStore.getState>;
