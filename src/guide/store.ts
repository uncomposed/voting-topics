import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createGuideFromTemplate,
  VoterGuideDraftSchema,
  type ElectionTemplate,
  type VoterGuideDraft,
} from './schema';

export const GUIDE_STORAGE_KEY = 'vt.guide.v1';
export const LEGACY_STORAGE_KEY = 'vt.m2';

interface GuideState {
  draft: VoterGuideDraft | null;
  backup: VoterGuideDraft | null;
  legacyDismissed: boolean;
  startGuide: (template: ElectionTemplate) => VoterGuideDraft;
  replaceDraft: (guide: VoterGuideDraft) => void;
  updateDraft: (update: (guide: VoterGuideDraft) => VoterGuideDraft) => void;
  dismissLegacy: () => void;
  reset: () => void;
}

function timestamp(guide: VoterGuideDraft): VoterGuideDraft {
  return { ...guide, updatedAt: new Date().toISOString() };
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      draft: null,
      backup: null,
      legacyDismissed: false,
      startGuide: (template) => {
        const guide = createGuideFromTemplate(template);
        set((state) => ({ draft: guide, backup: state.draft }));
        return guide;
      },
      replaceDraft: (guideInput) => {
        const guide = VoterGuideDraftSchema.parse(guideInput);
        set((state) => ({ draft: timestamp(guide), backup: state.draft }));
      },
      updateDraft: (update) => {
        set((state) => {
          if (!state.draft) return state;
          return { draft: timestamp(VoterGuideDraftSchema.parse(update(state.draft))) };
        });
      },
      dismissLegacy: () => set({ legacyDismissed: true }),
      reset: () => set({ draft: null, backup: null, legacyDismissed: false }),
    }),
    {
      name: GUIDE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ draft, backup, legacyDismissed }) => ({
        draft,
        backup,
        legacyDismissed,
      }),
    },
  ),
);

export function readLegacyData(): string | null {
  try {
    return localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}
