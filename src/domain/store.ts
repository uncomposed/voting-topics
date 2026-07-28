import { create } from 'zustand';
import { z } from 'zod';
import { DEMO_ELECTION, DEMO_PROFILE, createDemoWorkspace } from './demo';
import type { PrototypeMigrationPreview } from './migration';
import { generateDraft } from './scoring';
import { parsePeerGuide } from './share';
import { PRIORITY_MENU } from './priority-menu';
import {
  ElectionMapSchema,
  ElectionTemplateSchema,
  ElectionWorkspaceSchema,
  MAP_VERSION,
  PeerGuideSchema,
  PreviousPeerGuideSchema,
  PreviousTopicProfileSchema,
  PROFILE_VERSION,
  TopicProfileSchema,
  newId,
  upgradeElection,
  upgradeTopicProfile,
  verifiedNow,
  type AssessmentBatch,
  type BallotMark,
  type Contest,
  type ContestDecision,
  type ElectionMap,
  type ElectionProposal,
  type ElectionTemplate,
  type ElectionWorkspace,
  type MappingAssessment,
  type PeerGuide,
  type PriorityProposal,
  type RelevanceProposal,
  type ReviewProposal,
  type Source,
  type Topic,
  type TopicProfile,
} from './schema';

export const PROFILE_STORAGE_KEY = 'vt.topic-profiles.v3';
export const PREVIOUS_PROFILE_STORAGE_KEY = 'vt.topic-profiles.v2';
export const ELECTION_STORAGE_KEY = 'vt.elections.v3';
export const WORKSPACE_STORAGE_KEY = 'vt.ballot-workspaces.v2';
export const GUIDE_STORAGE_KEY = 'vt.peer-guides.v3';
export const PREVIOUS_GUIDE_STORAGE_KEY = 'vt.peer-guides.v2';
export const LIBRARY_PREFERENCES_KEY = 'vt.library-preferences.v1';
export const PROFILE_BACKUP_KEY = 'vt.topic-profiles.v3.backup';
export const ELECTION_BACKUP_KEY = 'vt.elections.v3.backup';
export const WORKSPACE_BACKUP_KEY = 'vt.ballot-workspaces.v2.backup';
export const GUIDE_BACKUP_KEY = 'vt.peer-guides.v3.backup';
export const PROTOTYPE_PROFILE_STORAGE_KEY = 'vt.topic-profile.v1';
export const PROTOTYPE_WORKSPACE_STORAGE_KEY = 'vt.election-workspaces.v1';
export const LEGACY_STORAGE_KEY = 'vt.m2';
export const EXPERIMENTAL_GUIDE_KEY = 'vt.guide.v1';
export const FORK_PARENT_KEY = 'vt.peer-guide.parent.v3';
export const PREVIOUS_FORK_PARENT_KEY = 'vt.peer-guide.parent.v2';

const ProfilesSchema = z.array(TopicProfileSchema);
const ElectionsSchema = z.array(ElectionTemplateSchema);
const WorkspacesSchema = z.array(ElectionWorkspaceSchema);
const GuidesSchema = z.array(PeerGuideSchema);
const PreviousProfilesSchema = z.array(PreviousTopicProfileSchema);
const PreviousGuidesSchema = z.array(PreviousPeerGuideSchema);
const PreferencesSchema = z.object({
  archivedProfileIds: z.array(z.string()).default([]), archivedElectionIds: z.array(z.string()).default([]), archivedWorkspaceIds: z.array(z.string()).default([]), archivedGuideIds: z.array(z.string()).default([]),
});

type LibraryPreferences = z.infer<typeof PreferencesSchema>;

function readStored<T>(key: string, schema: { parse: (input: unknown) => T }, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? schema.parse(JSON.parse(raw)) : fallback;
  } catch { return fallback; }
}

function writeStored(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function backupCurrent(): void {
  for (const [key, backup] of [[PROFILE_STORAGE_KEY, PROFILE_BACKUP_KEY], [ELECTION_STORAGE_KEY, ELECTION_BACKUP_KEY], [WORKSPACE_STORAGE_KEY, WORKSPACE_BACKUP_KEY], [GUIDE_STORAGE_KEY, GUIDE_BACKUP_KEY]] as const) {
    const raw = localStorage.getItem(key);
    if (raw) localStorage.setItem(backup, raw);
  }
}

function readProfilesWithMigration(): TopicProfile[] {
  const current = readStored(PROFILE_STORAGE_KEY, ProfilesSchema, []);
  if (current.length || localStorage.getItem(PROFILE_STORAGE_KEY)) return current;
  const previous = readStored(PREVIOUS_PROFILE_STORAGE_KEY, PreviousProfilesSchema, []);
  if (!previous.length) return [];
  const migrated = previous.map((profile) => upgradeTopicProfile(profile));
  writeStored(PROFILE_STORAGE_KEY, migrated);
  return migrated;
}

function initialize(): { profiles: TopicProfile[]; elections: ElectionTemplate[]; workspaces: ElectionWorkspace[]; guides: PeerGuide[]; preferences: LibraryPreferences; parentGuide: PeerGuide | null } {
  if (typeof localStorage === 'undefined') return { profiles: [], elections: [], workspaces: [], guides: [], preferences: { archivedProfileIds: [], archivedElectionIds: [], archivedWorkspaceIds: [], archivedGuideIds: [] }, parentGuide: null };
  return {
    profiles: readProfilesWithMigration(),
    elections: readStored(ELECTION_STORAGE_KEY, ElectionsSchema, []),
    workspaces: readStored(WORKSPACE_STORAGE_KEY, WorkspacesSchema, []),
    guides: readStored(GUIDE_STORAGE_KEY, GuidesSchema, []),
    preferences: readStored(LIBRARY_PREFERENCES_KEY, PreferencesSchema, { archivedProfileIds: [], archivedElectionIds: [], archivedWorkspaceIds: [], archivedGuideIds: [] }),
    parentGuide: readStored(FORK_PARENT_KEY, PeerGuideSchema.nullable(), null),
  };
}

function blankElection(now = new Date().toISOString()): ElectionTemplate {
  return ElectionTemplateSchema.parse({
    version: 'vt.election-template.v3', id: newId('election'), title: 'My election', electionDate: now.slice(0, 10),
    jurisdiction: 'My jurisdiction', isFictional: false,
    disclaimer: 'Verify official ballot instructions and candidate lists before voting.',
    sources: [], authorship: { kind: 'human' }, lineage: {}, createdAt: now, updatedAt: now,
    contests: [{ id: newId('contest'), title: 'First contest', method: 'fptp', verification: { status: 'draft' }, sourceIds: [], options: [{ id: newId('option'), name: 'Option A' }, { id: newId('option'), name: 'Option B' }] }],
  });
}

function blankProfile(title = 'My priorities', ownerLabel?: string, now = new Date().toISOString()): TopicProfile {
  return TopicProfileSchema.parse({ version: PROFILE_VERSION, id: newId('profile'), title, ownerLabel, topics: [], authorship: { kind: 'human' }, createdAt: now, updatedAt: now });
}

function blankWorkspace(profile: TopicProfile, election: ElectionTemplate, now = new Date().toISOString()): ElectionWorkspace {
  const mapping: ElectionMap = ElectionMapSchema.parse({ version: MAP_VERSION, id: newId('map'), electionId: election.id, profileId: profile.id, authorLabel: profile.ownerLabel, sources: [], contests: [], createdAt: now, updatedAt: now });
  return ElectionWorkspaceSchema.parse({ id: newId('workspace'), profileId: profile.id, electionId: election.id, mapping, draft: generateDraft(profile, election, mapping, now), decisions: election.contests.map((contest) => ({ contestId: contest.id, confirmed: false, override: null, personalNote: '' })), createdAt: now, updatedAt: now });
}

interface AppState {
  profiles: TopicProfile[];
  elections: ElectionTemplate[];
  workspaces: ElectionWorkspace[];
  guides: PeerGuide[];
  preferences: LibraryPreferences;
  activeProfileId: string | null;
  activeElectionId: string | null;
  activeWorkspaceId: string | null;
  parentGuide: PeerGuide | null;
  installDemo: () => void;
  createProfile: (title?: string, ownerLabel?: string) => string;
  duplicateProfile: (profileId: string) => string | null;
  importProfile: (profile: unknown) => string;
  importGuide: (guide: PeerGuide) => void;
  importPrototypeLibrary: (preview: PrototypeMigrationPreview) => void;
  setActiveProfile: (id: string) => void;
  updateProfile: (patch: Partial<Pick<TopicProfile, 'title' | 'ownerLabel'>>) => void;
  addTopic: () => void;
  addMenuTopics: (itemIds: string[]) => void;
  applyPriorityProposal: (proposal: PriorityProposal, selectedKeys: Set<string>, toolLabel?: string) => void;
  updateTopic: (topicId: string, patch: Partial<Pick<Topic, 'title' | 'description' | 'stars' | 'category' | 'notes'>>) => number;
  removeTopic: (topicId: string) => void;
  createElection: () => string;
  duplicateElection: (electionId: string) => string | null;
  importElection: (election: unknown, importedFrom?: string) => string;
  applyElectionProposal: (proposal: ElectionProposal, toolLabel?: string) => string;
  setActiveElection: (id: string) => void;
  updateElection: (patch: Partial<Pick<ElectionTemplate, 'title' | 'electionDate' | 'jurisdiction' | 'disclaimer'>>) => void;
  replaceContests: (contests: Contest[]) => void;
  upsertElectionSource: (source: Source) => void;
  verifyContest: (contestId: string, verified: boolean) => void;
  createWorkspace: (profileId: string, electionId: string) => string;
  setActiveWorkspace: (id: string) => void;
  resumeOrCreateWorkspace: (profileId: string, electionId: string) => string;
  setRelevantTopics: (contestId: string, topicIds: string[]) => void;
  applyRelevanceProposal: (proposal: RelevanceProposal, contestIds: Set<string>, toolLabel?: string) => void;
  upsertSource: (source: Source) => void;
  setAssessment: (contestId: string, optionId: string, topicId: string, assessment: MappingAssessment | null) => void;
  applyAssessmentBatch: (batch: AssessmentBatch, acceptedKeys: Set<string>, toolLabel?: string) => void;
  applyReviewProposal: (proposal: ReviewProposal, contestIds: Set<string>, toolLabel?: string) => void;
  regenerate: () => void;
  setDecision: (contestId: string, patch: Partial<ContestDecision>) => void;
  archiveArtifact: (kind: 'profile' | 'election' | 'workspace' | 'guide', id: string, archived: boolean) => void;
  forkGuide: (guide: PeerGuide, authorLabel: string) => void;
  setParentGuide: (guide: PeerGuide | null) => void;
  migrateStoredArtifacts: () => Promise<void>;
  reset: () => void;
}

const initial = initialize();

function save(state: Pick<AppState, 'profiles' | 'elections' | 'workspaces' | 'guides' | 'preferences'>) {
  writeStored(PROFILE_STORAGE_KEY, state.profiles);
  writeStored(ELECTION_STORAGE_KEY, state.elections);
  writeStored(WORKSPACE_STORAGE_KEY, state.workspaces);
  writeStored(GUIDE_STORAGE_KEY, state.guides);
  writeStored(LIBRARY_PREFERENCES_KEY, state.preferences);
}

function regenerateWorkspace(profile: TopicProfile, election: ElectionTemplate, workspace: ElectionWorkspace, now: string): ElectionWorkspace {
  return ElectionWorkspaceSchema.parse({ ...workspace, draft: generateDraft(profile, election, workspace.mapping, now), updatedAt: now });
}

export const useAppStore = create<AppState>((set, get) => {
  const commit = (patch: Partial<AppState>) => {
    const next = { ...get(), ...patch };
    save(next);
    set(patch);
  };

  const context = () => {
    const state = get();
    return {
      state,
      profile: state.profiles.find((item) => item.id === state.activeProfileId),
      election: state.elections.find((item) => item.id === state.activeElectionId),
      workspace: state.workspaces.find((item) => item.id === state.activeWorkspaceId),
    };
  };

  const replaceElectionEverywhere = (election: ElectionTemplate, changedContestIds = new Set<string>()) => {
    const state = get();
    const profiles = new Map(state.profiles.map((profile) => [profile.id, profile]));
    const workspaces = state.workspaces.map((workspace) => {
      if (workspace.electionId !== election.id) return workspace;
      const profile = profiles.get(workspace.profileId);
      if (!profile) return workspace;
      const valid = new Set(election.contests.map((contest) => contest.id));
      const mapping = { ...workspace.mapping, contests: workspace.mapping.contests.filter((contest) => valid.has(contest.contestId) && !changedContestIds.has(contest.contestId)), updatedAt: new Date().toISOString() };
      const decisions = election.contests.map((contest) => changedContestIds.has(contest.id)
        ? { contestId: contest.id, confirmed: false, override: null as BallotMark | null, personalNote: '' }
        : workspace.decisions.find((decision) => decision.contestId === contest.id) ?? { contestId: contest.id, confirmed: false, override: null, personalNote: '' });
      return regenerateWorkspace(profile, election, { ...workspace, mapping, decisions }, mapping.updatedAt);
    });
    commit({ elections: [...state.elections.filter((item) => item.id !== election.id), election], workspaces });
  };

  return {
    ...initial,
    activeProfileId: initial.profiles.find((item) => !initial.preferences.archivedProfileIds.includes(item.id))?.id ?? null,
    activeElectionId: initial.elections.find((item) => !initial.preferences.archivedElectionIds.includes(item.id))?.id ?? null,
    activeWorkspaceId: initial.workspaces.find((item) => !initial.preferences.archivedWorkspaceIds.includes(item.id))?.id ?? null,
    installDemo: () => {
      backupCurrent();
      const state = get();
      const demoWorkspace = createDemoWorkspace();
      const profiles = [...state.profiles.filter((item) => item.id !== DEMO_PROFILE.id), structuredClone(DEMO_PROFILE)];
      const elections = [...state.elections.filter((item) => item.id !== DEMO_ELECTION.id), structuredClone(DEMO_ELECTION)];
      const workspaces = [...state.workspaces.filter((item) => item.id !== demoWorkspace.id), demoWorkspace];
      const preferences = { ...state.preferences, archivedProfileIds: state.preferences.archivedProfileIds.filter((id) => id !== DEMO_PROFILE.id), archivedElectionIds: state.preferences.archivedElectionIds.filter((id) => id !== DEMO_ELECTION.id), archivedWorkspaceIds: state.preferences.archivedWorkspaceIds.filter((id) => id !== demoWorkspace.id) };
      save({ profiles, elections, workspaces, guides: state.guides, preferences });
      set({ profiles, elections, workspaces, preferences, activeProfileId: DEMO_PROFILE.id, activeElectionId: DEMO_ELECTION.id, activeWorkspaceId: demoWorkspace.id });
    },
    createProfile: (title, ownerLabel) => {
      const profile = blankProfile(title, ownerLabel);
      commit({ profiles: [...get().profiles, profile], activeProfileId: profile.id });
      return profile.id;
    },
    duplicateProfile: (profileId) => {
      const source = get().profiles.find((item) => item.id === profileId);
      if (!source) return null;
      const now = new Date().toISOString();
      const profile = TopicProfileSchema.parse({ ...structuredClone(source), id: newId('profile'), title: `${source.title} copy`, authorship: { kind: 'fork' }, createdAt: now, updatedAt: now });
      commit({ profiles: [...get().profiles, profile], activeProfileId: profile.id });
      return profile.id;
    },
    importProfile: (input) => {
      const profile = upgradeTopicProfile(input);
      commit({ profiles: [...get().profiles.filter((item) => item.id !== profile.id), profile], activeProfileId: profile.id });
      return profile.id;
    },
    importGuide: (guide) => {
      const parsed = PeerGuideSchema.parse(guide);
      commit({ guides: [...get().guides.filter((item) => item.snapshotDigest !== parsed.snapshotDigest), parsed] });
    },
    importPrototypeLibrary: (preview) => {
      const state = get();
      const profiles = [...state.profiles.filter((item) => !preview.profiles.some((incoming) => incoming.id === item.id)), ...preview.profiles];
      const elections = [...state.elections.filter((item) => !preview.elections.some((incoming) => incoming.id === item.id)), ...preview.elections];
      const workspaces = [...state.workspaces.filter((item) => !preview.workspaces.some((incoming) => incoming.id === item.id)), ...preview.workspaces];
      const activeWorkspace = preview.workspaces[0];
      const activeProfileId = activeWorkspace?.profileId ?? preview.profiles[0]?.id ?? state.activeProfileId;
      const activeElectionId = activeWorkspace?.electionId ?? preview.elections[0]?.id ?? state.activeElectionId;
      const activeWorkspaceId = activeWorkspace?.id ?? state.activeWorkspaceId;
      backupCurrent();
      save({ profiles, elections, workspaces, guides: state.guides, preferences: state.preferences });
      set({ profiles, elections, workspaces, activeProfileId, activeElectionId, activeWorkspaceId });
    },
    setActiveProfile: (id) => commit({ activeProfileId: id }),
    updateProfile: (patch) => {
      const { state, profile } = context();
      if (!profile) return;
      const now = new Date().toISOString();
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? TopicProfileSchema.parse({ ...item, ...patch, updatedAt: now }) : item) });
    },
    addTopic: () => {
      const { state, profile } = context();
      if (!profile) return;
      const now = new Date().toISOString();
      const next = TopicProfileSchema.parse({ ...profile, updatedAt: now, topics: [...profile.topics, { id: newId('topic'), title: 'A specific outcome I care about', stars: null, sources: [] }] });
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? next : item) });
    },
    addMenuTopics: (itemIds) => {
      const { state, profile } = context();
      if (!profile) return;
      const existingOrigins = new Set(profile.topics.map((topic) => topic.origin?.menuItemId).filter(Boolean));
      const additions = PRIORITY_MENU.items.filter((item) => itemIds.includes(item.id) && !existingOrigins.has(item.id)).map((item) => ({ id: newId('topic'), title: item.statement, category: item.category, stars: null, sources: [], origin: { menuId: PRIORITY_MENU.id, menuItemId: item.id, menuRevision: item.revision, menuDigest: PRIORITY_MENU.digest, customized: false } }));
      if (!additions.length) return;
      const next = TopicProfileSchema.parse({ ...profile, topics: [...profile.topics, ...additions], updatedAt: new Date().toISOString() });
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? next : item) });
    },
    applyPriorityProposal: (proposal, selectedKeys, toolLabel) => {
      const { state, profile } = context();
      if (!profile) return;
      const existingOrigins = new Set(profile.topics.map((topic) => topic.origin?.menuItemId).filter(Boolean));
      const selectedMenu = proposal.selections.filter((item) => selectedKeys.has(`menu:${item.menuItemId}`));
      const selectedCustom = proposal.customPriorities.filter((_item, index) => selectedKeys.has(`custom:${index}`));
      const menuTopics = selectedMenu.flatMap((selection) => {
        const item = PRIORITY_MENU.items.find((candidate) => candidate.id === selection.menuItemId);
        if (!item || existingOrigins.has(item.id)) return [];
        return [{ id: newId('topic'), title: item.statement, category: item.category, stars: selection.stars, notes: selection.note, sources: [], origin: { menuId: PRIORITY_MENU.id, menuItemId: item.id, menuRevision: item.revision, menuDigest: PRIORITY_MENU.digest, customized: false } }];
      });
      const customTopics = selectedCustom.map((item) => ({ id: item.id ?? newId('topic'), title: item.statement, category: item.category, stars: item.stars, notes: item.note, sources: [] }));
      const next = TopicProfileSchema.parse({ ...profile, topics: [...profile.topics, ...menuTopics, ...customTopics], authorship: { kind: 'chatbot', toolLabel, taskId: proposal.taskId, inputDigest: proposal.inputDigest }, updatedAt: new Date().toISOString() });
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? next : item) });
    },
    updateTopic: (topicId, patch) => {
      const { state, profile } = context();
      if (!profile) return 0;
      const before = profile.topics.find((topic) => topic.id === topicId);
      if (!before) return 0;
      const wordingChanged = (patch.title !== undefined && patch.title !== before.title) || (patch.description !== undefined && patch.description !== before.description);
      const now = new Date().toISOString();
      const nextProfile = TopicProfileSchema.parse({ ...profile, topics: profile.topics.map((topic) => topic.id === topicId ? { ...topic, ...patch, origin: wordingChanged && topic.origin ? { ...topic.origin, customized: true } : topic.origin } : topic), updatedAt: now });
      let invalidated = 0;
      const elections = new Map(state.elections.map((item) => [item.id, item]));
      const workspaces = state.workspaces.map((workspace) => {
        if (workspace.profileId !== profile.id) return workspace;
        const election = elections.get(workspace.electionId);
        if (!election) return workspace;
        const mapping = wordingChanged ? { ...workspace.mapping, updatedAt: now, contests: workspace.mapping.contests.map((contest) => ({ ...contest, assessments: contest.assessments.filter((assessment) => { const keep = assessment.topicId !== topicId; if (!keep) invalidated += 1; return keep; }) })) } : workspace.mapping;
        return regenerateWorkspace(nextProfile, election, { ...workspace, mapping }, now);
      });
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? nextProfile : item), workspaces });
      return invalidated;
    },
    removeTopic: (topicId) => {
      const { state, profile } = context();
      if (!profile) return;
      const now = new Date().toISOString();
      const nextProfile = TopicProfileSchema.parse({ ...profile, topics: profile.topics.filter((topic) => topic.id !== topicId), updatedAt: now });
      const elections = new Map(state.elections.map((item) => [item.id, item]));
      const workspaces = state.workspaces.map((workspace) => {
        if (workspace.profileId !== profile.id) return workspace;
        const election = elections.get(workspace.electionId);
        if (!election) return workspace;
        const mapping = { ...workspace.mapping, updatedAt: now, contests: workspace.mapping.contests.map((contest) => ({ ...contest, relevantTopicIds: contest.relevantTopicIds.filter((id) => id !== topicId), assessments: contest.assessments.filter((assessment) => assessment.topicId !== topicId) })) };
        return regenerateWorkspace(nextProfile, election, { ...workspace, mapping }, now);
      });
      commit({ profiles: state.profiles.map((item) => item.id === profile.id ? nextProfile : item), workspaces });
    },
    createElection: () => {
      const election = blankElection();
      commit({ elections: [...get().elections, election], activeElectionId: election.id });
      return election.id;
    },
    duplicateElection: (electionId) => {
      const source = get().elections.find((item) => item.id === electionId);
      if (!source) return null;
      const now = new Date().toISOString();
      const election = ElectionTemplateSchema.parse({ ...structuredClone(source), id: newId('election'), title: `${source.title} copy`, authorship: { kind: 'fork' }, lineage: { parentElectionId: source.id }, createdAt: now, updatedAt: now, contests: source.contests.map((contest) => ({ ...contest, verification: { status: 'draft' } })) });
      commit({ elections: [...get().elections, election], activeElectionId: election.id });
      return election.id;
    },
    importElection: (input, importedFrom) => {
      const upgraded = upgradeElection(input);
      const election = ElectionTemplateSchema.parse({ ...upgraded, authorship: { kind: 'import' }, lineage: { ...upgraded.lineage, importedFrom } });
      commit({ elections: [...get().elections.filter((item) => item.id !== election.id), election], activeElectionId: election.id });
      return election.id;
    },
    applyElectionProposal: (proposal, toolLabel) => {
      const election = ElectionTemplateSchema.parse({ ...proposal.election, authorship: { kind: 'chatbot', toolLabel, taskId: proposal.taskId, inputDigest: proposal.inputDigest }, contests: proposal.election.contests.map((contest) => ({ ...contest, verification: { status: 'draft' } })) });
      commit({ elections: [...get().elections.filter((item) => item.id !== election.id), election], activeElectionId: election.id });
      return election.id;
    },
    setActiveElection: (id) => commit({ activeElectionId: id }),
    updateElection: (patch) => {
      const { election } = context();
      if (!election) return;
      replaceElectionEverywhere(ElectionTemplateSchema.parse({ ...election, ...patch, updatedAt: new Date().toISOString() }));
    },
    replaceContests: (contests) => {
      const { election } = context();
      if (!election) return;
      const before = new Map(election.contests.map((contest) => [contest.id, contest]));
      const changed = new Set(contests.filter((contest) => {
        const previous = before.get(contest.id);
        if (!previous || previous.method !== contest.method || JSON.stringify(previous.options) !== JSON.stringify(contest.options)) return true;
        if (previous.method === 'choose-up-to' && contest.method === 'choose-up-to' && previous.maxSelections !== contest.maxSelections) return true;
        if (previous.method === 'rcv' && contest.method === 'rcv' && previous.maxRankings !== contest.maxRankings) return true;
        return false;
      }).map((contest) => contest.id));
      const removed = election.contests.filter((contest) => !contests.some((item) => item.id === contest.id)).map((contest) => contest.id);
      for (const id of removed) changed.add(id);
      replaceElectionEverywhere(ElectionTemplateSchema.parse({ ...election, contests, updatedAt: new Date().toISOString() }), changed);
    },
    upsertElectionSource: (source) => {
      const { election } = context();
      if (!election) return;
      replaceElectionEverywhere(ElectionTemplateSchema.parse({ ...election, sources: [...election.sources.filter((item) => item.id !== source.id), source], updatedAt: new Date().toISOString() }));
    },
    verifyContest: (contestId, verified) => {
      const { election } = context();
      if (!election) return;
      const verification = verified ? verifiedNow() : { status: 'draft' as const };
      replaceElectionEverywhere(ElectionTemplateSchema.parse({ ...election, contests: election.contests.map((contest) => contest.id === contestId ? { ...contest, verification } : contest), updatedAt: new Date().toISOString() }));
    },
    createWorkspace: (profileId, electionId) => {
      const state = get();
      const existing = state.workspaces.find((item) => item.profileId === profileId && item.electionId === electionId);
      if (existing) { commit({ activeWorkspaceId: existing.id, activeProfileId: profileId, activeElectionId: electionId }); return existing.id; }
      const profile = state.profiles.find((item) => item.id === profileId);
      const election = state.elections.find((item) => item.id === electionId);
      if (!profile || !election) throw new Error('Choose a valid profile and election.');
      const workspace = blankWorkspace(profile, election);
      commit({ workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id, activeProfileId: profileId, activeElectionId: electionId });
      return workspace.id;
    },
    resumeOrCreateWorkspace: (profileId, electionId) => {
      const state = get();
      const archived = new Set(state.preferences.archivedWorkspaceIds);
      const existing = state.workspaces
        .filter((item) => item.profileId === profileId && item.electionId === electionId && !archived.has(item.id))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      if (existing) {
        commit({ activeWorkspaceId: existing.id, activeProfileId: profileId, activeElectionId: electionId });
        return existing.id;
      }
      const profile = state.profiles.find((item) => item.id === profileId);
      const election = state.elections.find((item) => item.id === electionId);
      if (!profile || !election) throw new Error('Choose a valid profile and election.');
      const workspace = blankWorkspace(profile, election);
      commit({ workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id, activeProfileId: profileId, activeElectionId: electionId });
      return workspace.id;
    },
    setActiveWorkspace: (id) => {
      const workspace = get().workspaces.find((item) => item.id === id);
      if (workspace) commit({ activeWorkspaceId: id, activeProfileId: workspace.profileId, activeElectionId: workspace.electionId });
    },
    setRelevantTopics: (contestId, topicIds) => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const existing = workspace.mapping.contests.find((contest) => contest.contestId === contestId);
      const now = new Date().toISOString();
      const remaining = workspace.mapping.contests.filter((contest) => contest.contestId !== contestId);
      const contestMap = { contestId, relevantTopicIds: topicIds, assessments: (existing?.assessments ?? []).filter((assessment) => topicIds.includes(assessment.topicId)), authorship: { kind: 'human' as const }, verification: verifiedNow() };
      const mapping = ElectionMapSchema.parse({ ...workspace.mapping, contests: topicIds.length ? [...remaining, contestMap] : remaining, updatedAt: now });
      const next = regenerateWorkspace(profile, election, { ...workspace, mapping }, now);
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    applyRelevanceProposal: (proposal, contestIds, toolLabel) => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const proposed = new Map(proposal.contests.filter((item) => contestIds.has(item.contestId)).map((item) => [item.contestId, item.topicIds]));
      const now = new Date().toISOString();
      const contests = election.contests.flatMap((contest) => {
        const topicIds = proposed.get(contest.id);
        const existing = workspace.mapping.contests.find((item) => item.contestId === contest.id);
        if (!topicIds) return existing ? [existing] : [];
        return [{ contestId: contest.id, relevantTopicIds: topicIds, assessments: (existing?.assessments ?? []).filter((assessment) => topicIds.includes(assessment.topicId)), authorship: { kind: 'chatbot' as const, toolLabel, taskId: proposal.taskId, inputDigest: proposal.inputDigest }, verification: verifiedNow(now) }];
      });
      const mapping = ElectionMapSchema.parse({ ...workspace.mapping, contests, updatedAt: now });
      const next = regenerateWorkspace(profile, election, { ...workspace, mapping }, now);
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    upsertSource: (source) => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const now = new Date().toISOString();
      const mapping = ElectionMapSchema.parse({ ...workspace.mapping, sources: [...workspace.mapping.sources.filter((item) => item.id !== source.id), source], updatedAt: now });
      const next = regenerateWorkspace(profile, election, { ...workspace, mapping }, now);
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    setAssessment: (contestId, optionId, topicId, assessment) => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const contests = workspace.mapping.contests.map((contest) => contest.contestId !== contestId ? contest : { ...contest, assessments: [...contest.assessments.filter((cell) => cell.optionId !== optionId || cell.topicId !== topicId), ...(assessment ? [assessment] : [])] });
      const now = new Date().toISOString();
      const mapping = ElectionMapSchema.parse({ ...workspace.mapping, contests, updatedAt: now });
      const next = regenerateWorkspace(profile, election, { ...workspace, mapping, decisions: workspace.decisions.map((decision) => decision.contestId === contestId ? { ...decision, confirmed: false } : decision) }, now);
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    applyAssessmentBatch: (batch, acceptedKeys, toolLabel) => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const accepted = batch.assessments.filter((assessment) => acceptedKeys.has(`${assessment.optionId}\u0000${assessment.topicId}`)).map((assessment) => ({ ...assessment, authorship: { kind: 'chatbot' as const, toolLabel, taskId: batch.taskId, inputDigest: batch.inputDigest }, verification: verifiedNow() }));
      const contestMap = workspace.mapping.contests.find((contest) => contest.contestId === batch.contestId);
      if (!contestMap) return;
      const acceptedKeysInternal = new Set(accepted.map((assessment) => `${assessment.optionId}\u0000${assessment.topicId}`));
      const contests = workspace.mapping.contests.map((contest) => contest.contestId !== batch.contestId ? contest : { ...contest, assessments: [...contest.assessments.filter((assessment) => !acceptedKeysInternal.has(`${assessment.optionId}\u0000${assessment.topicId}`)), ...accepted] });
      const now = new Date().toISOString();
      const mapping = ElectionMapSchema.parse({ ...workspace.mapping, sources: [...workspace.mapping.sources.filter((source) => !batch.sources.some((incoming) => incoming.id === source.id)), ...batch.sources], contests, updatedAt: now });
      const next = regenerateWorkspace(profile, election, { ...workspace, mapping, decisions: workspace.decisions.map((decision) => decision.contestId === batch.contestId ? { ...decision, confirmed: false } : decision) }, now);
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    applyReviewProposal: (proposal, contestIds, toolLabel) => {
      const { state, workspace } = context();
      if (!workspace) return;
      const notes = new Map(proposal.contests.filter((item) => contestIds.has(item.contestId) && item.personalNote !== undefined).map((item) => [item.contestId, item.personalNote ?? '']));
      const next = ElectionWorkspaceSchema.parse({ ...workspace, decisions: workspace.decisions.map((decision) => notes.has(decision.contestId) ? { ...decision, personalNote: notes.get(decision.contestId) ?? '', noteAuthorship: { kind: 'chatbot', toolLabel, taskId: proposal.taskId, inputDigest: proposal.inputDigest }, confirmed: false } : decision), updatedAt: new Date().toISOString() });
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    regenerate: () => {
      const { state, profile, election, workspace } = context();
      if (!profile || !election || !workspace) return;
      const next = regenerateWorkspace(profile, election, workspace, new Date().toISOString());
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    setDecision: (contestId, patch) => {
      const { state, workspace } = context();
      if (!workspace) return;
      const next = ElectionWorkspaceSchema.parse({ ...workspace, decisions: workspace.decisions.map((decision) => decision.contestId === contestId ? { ...decision, ...patch, ...(patch.personalNote !== undefined ? { noteAuthorship: { kind: 'human' as const } } : {}) } : decision), updatedAt: new Date().toISOString() });
      commit({ workspaces: state.workspaces.map((item) => item.id === workspace.id ? next : item) });
    },
    archiveArtifact: (kind, id, archived) => {
      const state = get();
      const key = kind === 'profile' ? 'archivedProfileIds' : kind === 'election' ? 'archivedElectionIds' : kind === 'workspace' ? 'archivedWorkspaceIds' : 'archivedGuideIds';
      const ids = state.preferences[key];
      const preferences = { ...state.preferences, [key]: archived ? [...new Set([...ids, id])] : ids.filter((item) => item !== id) };
      commit({ preferences });
    },
    forkGuide: (guide, authorLabel) => {
      backupCurrent();
      const state = get();
      const suffix = newId('fork');
      const now = new Date().toISOString();
      const profile = TopicProfileSchema.parse({ ...structuredClone(guide.profile), id: `${guide.profile.id}-${suffix}`, ownerLabel: authorLabel, authorship: { kind: 'fork' }, createdAt: now, updatedAt: now });
      const election = ElectionTemplateSchema.parse({ ...structuredClone(guide.election), id: `${guide.election.id}-${suffix}`, title: `${guide.election.title} copy`, authorship: { kind: 'fork' }, lineage: { parentElectionId: guide.election.id }, createdAt: now, updatedAt: now });
      const mapping = ElectionMapSchema.parse({ ...structuredClone(guide.mapping), id: `${guide.mapping.id}-${suffix}`, profileId: profile.id, electionId: election.id, authorLabel, createdAt: now, updatedAt: now });
      const workspace = ElectionWorkspaceSchema.parse({ id: `${guide.id}-${suffix}`, profileId: profile.id, electionId: election.id, mapping, draft: generateDraft(profile, election, mapping, now), decisions: guide.decisions.map((decision) => ({ ...decision, confirmed: false })), createdAt: now, updatedAt: now });
      const profiles = [...state.profiles, profile]; const elections = [...state.elections, election]; const workspaces = [...state.workspaces, workspace];
      const guides = [...state.guides.filter((item) => item.snapshotDigest !== guide.snapshotDigest), guide];
      save({ profiles, elections, workspaces, guides, preferences: state.preferences });
      writeStored(FORK_PARENT_KEY, guide);
      set({ profiles, elections, workspaces, guides, activeProfileId: profile.id, activeElectionId: election.id, activeWorkspaceId: workspace.id, parentGuide: guide });
    },
    setParentGuide: (guide) => { if (guide) writeStored(FORK_PARENT_KEY, guide); else localStorage.removeItem(FORK_PARENT_KEY); set({ parentGuide: guide }); },
    migrateStoredArtifacts: async () => {
      const state = get();
      const rawGuides = readStored(PREVIOUS_GUIDE_STORAGE_KEY, PreviousGuidesSchema, []);
      const migratedGuides = (await Promise.all(rawGuides.map(async (guide) => {
        try { return await parsePeerGuide(guide); } catch { return null; }
      }))).filter((guide): guide is PeerGuide => Boolean(guide));
      let parentGuide = state.parentGuide;
      if (!parentGuide) {
        try {
          const rawParent = localStorage.getItem(PREVIOUS_FORK_PARENT_KEY);
          if (rawParent) parentGuide = await parsePeerGuide(JSON.parse(rawParent));
        } catch { /* Preserve unreadable previous data without importing it. */ }
      }
      if (!migratedGuides.length && !parentGuide) return;
      const guides = [...state.guides];
      for (const guide of migratedGuides) if (!guides.some((item) => item.snapshotDigest === guide.snapshotDigest)) guides.push(guide);
      writeStored(GUIDE_STORAGE_KEY, guides);
      if (parentGuide) writeStored(FORK_PARENT_KEY, parentGuide);
      set({ guides, parentGuide });
    },
    reset: () => {
      backupCurrent();
      const profiles: TopicProfile[] = []; const elections: ElectionTemplate[] = []; const workspaces: ElectionWorkspace[] = []; const guides: PeerGuide[] = [];
      const preferences = { archivedProfileIds: [], archivedElectionIds: [], archivedWorkspaceIds: [], archivedGuideIds: [] };
      save({ profiles, elections, workspaces, guides, preferences }); localStorage.removeItem(FORK_PARENT_KEY);
      set({ profiles, elections, workspaces, guides, preferences, activeProfileId: null, activeElectionId: null, activeWorkspaceId: null, parentGuide: null });
    },
  };
});

export function readRawLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
