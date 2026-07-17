import { create } from 'zustand';
import { z } from 'zod';
import { DEMO_PROFILE, createDemoWorkspace } from './demo';
import { generateDraft } from './scoring';
import {
  ElectionWorkspaceSchema,
  ElectionTemplateSchema,
  ELECTION_VERSION,
  MAP_VERSION,
  PeerGuideSchema,
  TopicProfileSchema,
  newId,
  type BallotMark,
  type Contest,
  type ContestDecision,
  type ElectionWorkspace,
  type ElectionMap,
  type MappingAssessment,
  type PeerGuide,
  type Source,
  type Topic,
  type TopicProfile,
} from './schema';
import { updateTopic as updateTopicDomain } from './mutations';

export const PROFILE_STORAGE_KEY = 'vt.topic-profile.v1';
export const WORKSPACE_STORAGE_KEY = 'vt.election-workspaces.v1';
export const PROFILE_BACKUP_KEY = 'vt.topic-profile.v1.backup';
export const WORKSPACE_BACKUP_KEY = 'vt.election-workspaces.v1.backup';
export const LEGACY_STORAGE_KEY = 'vt.m2';
export const EXPERIMENTAL_GUIDE_KEY = 'vt.guide.v1';
export const FORK_PARENT_KEY = 'vt.peer-guide.parent.v1';

const ProfilesSchema = z.array(TopicProfileSchema);
const WorkspacesSchema = z.array(ElectionWorkspaceSchema);

function readStored<T>(key: string, schema: { parse: (input: unknown) => T }, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? schema.parse(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function backupCurrent(): void {
  const profiles = localStorage.getItem(PROFILE_STORAGE_KEY);
  const workspaces = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (profiles) localStorage.setItem(PROFILE_BACKUP_KEY, profiles);
  if (workspaces) localStorage.setItem(WORKSPACE_BACKUP_KEY, workspaces);
}

function initialize(): { profiles: TopicProfile[]; workspaces: ElectionWorkspace[]; parentGuide: PeerGuide | null } {
  if (typeof localStorage === 'undefined') return { profiles: [], workspaces: [], parentGuide: null };
  return {
    profiles: readStored<TopicProfile[]>(PROFILE_STORAGE_KEY, ProfilesSchema, []),
    workspaces: readStored<ElectionWorkspace[]>(WORKSPACE_STORAGE_KEY, WorkspacesSchema, []),
    parentGuide: readStored<PeerGuide | null>(FORK_PARENT_KEY, PeerGuideSchema.nullable(), null),
  };
}

interface AppState {
  profiles: TopicProfile[];
  workspaces: ElectionWorkspace[];
  activeProfileId: string | null;
  activeWorkspaceId: string | null;
  parentGuide: PeerGuide | null;
  installDemo: () => void;
  importProfile: (profile: TopicProfile) => void;
  addTopic: () => void;
  updateTopic: (topicId: string, patch: Partial<Pick<Topic, 'title' | 'description' | 'stars' | 'category' | 'notes'>>) => number;
  removeTopic: (topicId: string) => void;
  updateElection: (patch: Partial<Pick<ElectionWorkspace['election'], 'title' | 'electionDate' | 'jurisdiction' | 'disclaimer'>>) => void;
  replaceContests: (contests: Contest[]) => void;
  setRelevantTopics: (contestId: string, topicIds: string[]) => void;
  upsertSource: (source: Source) => void;
  setAssessment: (contestId: string, optionId: string, topicId: string, assessment: MappingAssessment | null) => void;
  regenerate: () => void;
  setDecision: (contestId: string, patch: Partial<ContestDecision>) => void;
  forkGuide: (guide: PeerGuide, authorLabel: string) => void;
  setParentGuide: (guide: PeerGuide | null) => void;
  reset: () => void;
}

const initial = initialize();

function save(profiles: TopicProfile[], workspaces: ElectionWorkspace[]) {
  writeStored(PROFILE_STORAGE_KEY, profiles);
  writeStored(WORKSPACE_STORAGE_KEY, workspaces);
}

function changedWorkspace(profile: TopicProfile, workspace: ElectionWorkspace, now: string): ElectionWorkspace {
  return { ...workspace, draft: generateDraft(profile, workspace.election, workspace.mapping, now), updatedAt: now };
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initial,
  activeProfileId: initial.profiles[0]?.id ?? null,
  activeWorkspaceId: initial.workspaces[0]?.id ?? null,
  parentGuide: initial.parentGuide,
  installDemo: () => {
    backupCurrent();
    const profiles = [structuredClone(DEMO_PROFILE)];
    const workspaces = [createDemoWorkspace()];
    save(profiles, workspaces);
    localStorage.removeItem(FORK_PARENT_KEY);
    set({ profiles, workspaces, activeProfileId: profiles[0].id, activeWorkspaceId: workspaces[0].id, parentGuide: null });
  },
  importProfile: (input) => {
    const profile = TopicProfileSchema.parse(input);
    const profiles = [...get().profiles.filter((candidate) => candidate.id !== profile.id), profile];
    let workspaces = get().workspaces;
    let activeWorkspaceId = workspaces.find((workspace) => workspace.mapping.profileId === profile.id)?.id ?? null;
    if (!activeWorkspaceId) {
      const now = new Date().toISOString();
      const election = ElectionTemplateSchema.parse({
        version: ELECTION_VERSION,
        id: newId('election'),
        title: 'My election',
        electionDate: now.slice(0, 10),
        jurisdiction: 'My jurisdiction',
        isFictional: false,
        disclaimer: 'Election details and evidence are entered by the guide author. Verify official ballot instructions before voting.',
        contests: [{ id: newId('contest'), title: 'First contest', method: 'fptp', options: [{ id: newId('option'), name: 'Option A' }, { id: newId('option'), name: 'Option B' }] }],
      });
      const mapping: ElectionMap = { version: MAP_VERSION, id: newId('map'), electionId: election.id, profileId: profile.id, authorLabel: profile.ownerLabel, sources: [], contests: [], createdAt: now, updatedAt: now };
      const draft = generateDraft(profile, election, mapping, now);
      const workspace = ElectionWorkspaceSchema.parse({ id: newId('workspace'), election, mapping, draft, decisions: election.contests.map((contest) => ({ contestId: contest.id, confirmed: false, override: null, personalNote: '' })), createdAt: now, updatedAt: now });
      workspaces = [...workspaces, workspace];
      activeWorkspaceId = workspace.id;
    }
    save(profiles, workspaces);
    set({ profiles, workspaces, activeProfileId: profile.id, activeWorkspaceId });
  },
  addTopic: () => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    if (!profile) return;
    const now = new Date().toISOString();
    const next = { ...profile, updatedAt: now, topics: [...profile.topics, { id: newId('topic'), title: 'A specific outcome I care about', stars: 3, sources: [] }] };
    const profiles = state.profiles.map((candidate) => candidate.id === profile.id ? next : candidate);
    save(profiles, state.workspaces);
    set({ profiles });
  },
  updateTopic: (topicId, patch) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    if (!profile) return 0;
    const related = state.workspaces.filter((workspace) => workspace.mapping.profileId === profile.id);
    const result = updateTopicDomain(profile, related, topicId, patch);
    const byId = new Map(result.workspaces.map((workspace) => [workspace.id, workspace]));
    const profiles = state.profiles.map((candidate) => candidate.id === profile.id ? result.profile : candidate);
    const workspaces = state.workspaces.map((workspace) => byId.get(workspace.id) ?? workspace);
    save(profiles, workspaces);
    set({ profiles, workspaces });
    return result.invalidatedCells;
  },
  removeTopic: (topicId) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    if (!profile) return;
    const now = new Date().toISOString();
    const profiles = state.profiles.map((candidate) => candidate.id === profile.id ? { ...candidate, topics: candidate.topics.filter((topic) => topic.id !== topicId), updatedAt: now } : candidate);
    const nextProfile = profiles.find((candidate) => candidate.id === profile.id)!;
    const workspaces = state.workspaces.map((workspace) => {
      if (workspace.mapping.profileId !== profile.id) return workspace;
      const mapping = { ...workspace.mapping, contests: workspace.mapping.contests.map((contest) => ({ ...contest, relevantTopicIds: contest.relevantTopicIds.filter((id) => id !== topicId), assessments: contest.assessments.filter((assessment) => assessment.topicId !== topicId) })) };
      return changedWorkspace(nextProfile, { ...workspace, mapping }, now);
    });
    save(profiles, workspaces);
    set({ profiles, workspaces });
  },
  updateElection: (patch) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    if (!profile) return;
    const now = new Date().toISOString();
    const workspaces = state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? changedWorkspace(profile, { ...workspace, election: { ...workspace.election, ...patch } }, now) : workspace);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  replaceContests: (contests) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
    if (!profile || !workspace) return;
    const now = new Date().toISOString();
    const previous = new Map(workspace.election.contests.map((contest) => [contest.id, contest]));
    const structurallyChanged = (contest: Contest) => {
      const before = previous.get(contest.id);
      if (!before || before.method !== contest.method || JSON.stringify(before.options) !== JSON.stringify(contest.options)) return true;
      if (before.method === 'choose-up-to' && contest.method === 'choose-up-to' && before.maxSelections !== contest.maxSelections) return true;
      if (before.method === 'rcv' && contest.method === 'rcv' && before.maxRankings !== contest.maxRankings) return true;
      return false;
    };
    const changed = new Set(contests.filter(structurallyChanged).map((contest) => contest.id));
    const valid = new Set(contests.map((contest) => contest.id));
    const election = { ...workspace.election, contests };
    const mapping = { ...workspace.mapping, contests: workspace.mapping.contests.filter((contest) => valid.has(contest.contestId) && !changed.has(contest.contestId)), updatedAt: now };
    const decisions = workspace.decisions.filter((decision) => valid.has(decision.contestId) && !changed.has(decision.contestId));
    const next = changedWorkspace(profile, { ...workspace, election, mapping, decisions: [...decisions, ...contests.filter((contest) => !decisions.some((decision) => decision.contestId === contest.id)).map((contest) => ({ contestId: contest.id, confirmed: false, override: null as BallotMark | null, personalNote: '' }))] }, now);
    const workspaces = state.workspaces.map((candidate) => candidate.id === workspace.id ? next : candidate);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  setRelevantTopics: (contestId, topicIds) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
    if (!profile || !workspace) return;
    const existing = workspace.mapping.contests.find((contest) => contest.contestId === contestId);
    const contestMap = { contestId, relevantTopicIds: topicIds, assessments: (existing?.assessments ?? []).filter((assessment) => topicIds.includes(assessment.topicId)) };
    const mapping = { ...workspace.mapping, contests: [...workspace.mapping.contests.filter((contest) => contest.contestId !== contestId), contestMap], updatedAt: new Date().toISOString() };
    const next = changedWorkspace(profile, { ...workspace, mapping }, mapping.updatedAt);
    const workspaces = state.workspaces.map((candidate) => candidate.id === workspace.id ? next : candidate);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  upsertSource: (source) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
    if (!profile || !workspace) return;
    const sources = [...workspace.mapping.sources.filter((candidate) => candidate.id !== source.id), source];
    const mapping = { ...workspace.mapping, sources, updatedAt: new Date().toISOString() };
    const next = changedWorkspace(profile, { ...workspace, mapping }, mapping.updatedAt);
    const workspaces = state.workspaces.map((candidate) => candidate.id === workspace.id ? next : candidate);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  setAssessment: (contestId, optionId, topicId, assessment) => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
    if (!profile || !workspace) return;
    const contests = workspace.mapping.contests.map((contest) => contest.contestId !== contestId ? contest : {
      ...contest,
      assessments: [...contest.assessments.filter((cell) => cell.optionId !== optionId || cell.topicId !== topicId), ...(assessment ? [assessment] : [])],
    });
    const now = new Date().toISOString();
    const mapping = { ...workspace.mapping, contests, updatedAt: now };
    const next = changedWorkspace(profile, { ...workspace, mapping, decisions: workspace.decisions.map((decision) => decision.contestId === contestId ? { ...decision, confirmed: false } : decision) }, now);
    const workspaces = state.workspaces.map((candidate) => candidate.id === workspace.id ? next : candidate);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  regenerate: () => {
    const state = get();
    const profile = state.profiles.find((candidate) => candidate.id === state.activeProfileId);
    if (!profile) return;
    const workspaces = state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? changedWorkspace(profile, workspace, new Date().toISOString()) : workspace);
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  setDecision: (contestId, patch) => {
    const state = get();
    const now = new Date().toISOString();
    const workspaces = state.workspaces.map((workspace) => workspace.id !== state.activeWorkspaceId ? workspace : { ...workspace, decisions: workspace.decisions.map((decision) => decision.contestId === contestId ? { ...decision, ...patch } : decision), updatedAt: now });
    save(state.profiles, workspaces);
    set({ workspaces });
  },
  forkGuide: (guide, authorLabel) => {
    backupCurrent();
    const suffix = newId('fork');
    const now = new Date().toISOString();
    const profile = { ...structuredClone(guide.profile), id: `${guide.profile.id}-${suffix}`, ownerLabel: authorLabel, createdAt: now, updatedAt: now };
    const mapping = { ...structuredClone(guide.mapping), id: `${guide.mapping.id}-${suffix}`, profileId: profile.id, authorLabel, createdAt: now, updatedAt: now };
    const draft = generateDraft(profile, guide.election, mapping, now);
    const workspace = ElectionWorkspaceSchema.parse({ id: `${guide.id}-${suffix}`, election: guide.election, mapping, draft, decisions: guide.decisions.map((decision) => ({ ...decision, confirmed: false })), createdAt: now, updatedAt: now });
    const profiles = [...get().profiles, profile];
    const workspaces = [...get().workspaces, workspace];
    save(profiles, workspaces);
    writeStored(FORK_PARENT_KEY, guide);
    set({ profiles, workspaces, activeProfileId: profile.id, activeWorkspaceId: workspace.id, parentGuide: guide });
  },
  setParentGuide: (guide) => {
    if (guide) writeStored(FORK_PARENT_KEY, guide); else localStorage.removeItem(FORK_PARENT_KEY);
    set({ parentGuide: guide });
  },
  reset: () => {
    backupCurrent();
    writeStored(PROFILE_STORAGE_KEY, []);
    writeStored(WORKSPACE_STORAGE_KEY, []);
    localStorage.removeItem(FORK_PARENT_KEY);
    set({ profiles: [], workspaces: [], activeProfileId: null, activeWorkspaceId: null, parentGuide: null });
  },
}));

export function readRawLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
