import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { LEGACY_STORAGE_KEY, useAppStore } from '../domain/store';

describe('corrected Gate 1 shell and safety', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    useAppStore.setState({ profiles: [], elections: [], workspaces: [], guides: [], preferences: { archivedProfileIds: [], archivedElectionIds: [], archivedWorkspaceIds: [], archivedGuideIds: [] }, activeProfileId: null, activeElectionId: null, activeWorkspaceId: null, parentGuide: null });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('starts with a reusable topic profile and exposes all builder stages', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open fictional demonstration' }));
    expect(screen.getByRole('heading', { name: 'What outcomes matter to you?' })).toBeInTheDocument();
    expect(screen.getAllByText('More residents can afford stable housing near jobs and services').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '2 Election' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 Pair & research' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 Draft & review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 Share' })).toBeInTheDocument();
  });

  it('keeps local work when a shared snapshot is malformed', async () => {
    useAppStore.getState().installDemo();
    const workspaceId = useAppStore.getState().workspaces[0].id;
    window.history.replaceState(null, '', '/#guide=p1.damaged');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Local work was not changed');
    expect(useAppStore.getState().workspaces[0].id).toBe(workspaceId);
    expect(screen.getByRole('button', { name: 'Resume research' })).toBeInTheDocument();
  });

  it('previews conversion and offers the exact untouched vt.m2 payload', async () => {
    const raw = JSON.stringify({ state: { version: 'tsb.v0', title: 'Old priorities', topics: [{ id: 'housing', title: 'Housing', importance: 5, mode: 'custom', direction: { custom: 'More people can afford stable homes' }, sources: [] }] } });
    localStorage.setItem(LEGACY_STORAGE_KEY, raw);
    const createObjectUrl = vi.fn(() => 'blob:legacy');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview conversion' }));
    expect(screen.getByText(/tsb.v0 → vt.topic-profile.v3/u)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel without changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download exact raw data' }));
    await waitFor(() => expect(createObjectUrl).toHaveBeenCalledOnce());
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(raw);
    expect(useAppStore.getState().profiles).toEqual([]);
  });

  it('accepts a preview as separate state while retaining exact vt.m2', () => {
    const raw = JSON.stringify({ state: { version: 'tsb.v1', title: 'Old priorities', topics: [{ id: 'housing', title: 'Housing', importance: 2, directions: [{ id: 'direction', text: 'More people can afford stable homes', stars: 4, sources: [] }] }] } });
    localStorage.setItem(LEGACY_STORAGE_KEY, raw);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview conversion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept as new profile' }));
    expect(screen.getByRole('heading', { name: 'What outcomes matter to you?' })).toBeInTheDocument();
    expect(useAppStore.getState().profiles[0].topics[0].stars).toBe(4);
    expect(useAppStore.getState().workspaces).toEqual([]);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(raw);
  });
});
