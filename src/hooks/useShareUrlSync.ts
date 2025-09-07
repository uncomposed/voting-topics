import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { encodeStarterPreferencesV2, buildShareUrlV2 } from '../utils/share';

// Keeps the URL's #sp=... in sync with the current topics.
// - Debounced to avoid excessive history.replaceState calls
// - Clears the hash when there are no topics
export const useShareUrlSync = (enabled: boolean = true, debounceMs: number = 400) => {
  const topics = useStore(s => s.topics);
  const lastPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        if (!topics || topics.length === 0) {
          // Clear hash when nothing to share
          history.replaceState(null, '', window.location.pathname + window.location.search);
          lastPayloadRef.current = null;
          return;
        }
        const payload = encodeStarterPreferencesV2(topics);
        if (payload && payload !== lastPayloadRef.current) {
          const url = buildShareUrlV2(payload);
          history.replaceState(null, '', url);
          lastPayloadRef.current = payload;
        }
      } catch {
        // no-op; best effort only
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [enabled, debounceMs, topics]);
};
