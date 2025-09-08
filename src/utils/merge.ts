import type { PreferenceSet, Topic, Direction } from '../schema';

const normalize = (s: string) => s.trim().toLowerCase();

const byId = <T extends { id: string }>(arr: T[]) => {
  const map = new Map<string, T>();
  for (const item of arr) map.set(item.id, item);
  return map;
};

const mergeDirections = (current: Direction[], incoming: Direction[]): Direction[] => {
  const currentById = byId(current);
  const incomingById = byId(incoming);

  // Index by normalized text for fallback match when ids differ/missing
  const currentByText = new Map<string, Direction>();
  for (const d of current) currentByText.set(normalize(d.text), d);

  const merged: Direction[] = [];

  // Prefer keeping existing directions (preserve stars/notes), enrich with incoming matches
  for (const d of current) {
    let match = incomingById.get(d.id);
    if (!match) match = incoming.find(x => normalize(x.text) === normalize(d.text));
    if (match) {
      merged.push({
        id: d.id, // keep current id for stability
        text: match.text || d.text,
        stars: typeof match.stars === 'number' ? match.stars : d.stars,
        notes: match.notes ?? d.notes,
        sources: match.sources?.length ? match.sources : d.sources,
        tags: match.tags?.length ? match.tags : d.tags,
      });
    } else {
      merged.push(d);
    }
  }

  // Add truly new incoming directions
  for (const inc of incoming) {
    const existsById = currentById.has(inc.id);
    const existsByText = currentByText.has(normalize(inc.text));
    if (!existsById && !existsByText) merged.push(inc);
  }

  return merged;
};

const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();
    // trim trailing slashes from pathname
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
};

const mergeTopic = (current: Topic, incoming: Topic): Topic => {
  return {
    id: current.id,
    title: current.title, // prefer current title
    importance: current.importance, // keep user’s current ordering/priority
    stance: current.stance, // keep user stance
    directions: mergeDirections(current.directions || [], incoming.directions || []),
    // Append notes if both exist
    notes: current.notes && incoming.notes && normalize(incoming.notes) !== normalize(current.notes)
      ? `${current.notes}\n\n— Imported —\n${incoming.notes}`
      : (current.notes ?? incoming.notes),
    // Prefer non-empty sources; simple union when both exist
    sources: (() => {
      const a = current.sources || [];
      const b = incoming.sources || [];
      if (!a.length) return b;
      if (!b.length) return a;
      const seen = new Set<string>();
      const merged = [...a, ...b].filter(s => {
        const key = `${s.label}|${normalizeUrl(s.url || '')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return merged;
    })(),
    relations: current.relations || incoming.relations || { broader: [], narrower: [], related: [] },
  };
};

export const mergePreferenceSets = (current: PreferenceSet, incoming: PreferenceSet): PreferenceSet => {
  // Index current and incoming topics
  const currentById = byId(current.topics);
  const currentByTitle = new Map<string, Topic>();
  for (const t of current.topics) currentByTitle.set(normalize(t.title), t);

  const mergedTopics: Topic[] = [];

  // Keep all current topics, merging with incoming if matched
  for (const t of current.topics) {
    let match = incoming.topics.find(x => x.id === t.id);
    if (!match) match = incoming.topics.find(x => normalize(x.title) === normalize(t.title));
    if (match) {
      mergedTopics.push(mergeTopic(t, match));
    } else {
      mergedTopics.push(t);
    }
  }

  // Add any truly new incoming topics
  for (const inc of incoming.topics) {
    const existsById = currentById.has(inc.id);
    const existsByTitle = currentByTitle.has(normalize(inc.title));
    if (!existsById && !existsByTitle) mergedTopics.push(inc);
  }

  return {
    version: 'tsb.v1',
    title: current.title, // keep user title
    notes: current.notes, // keep user notes (we appended within topics already)
    topics: mergedTopics,
    createdAt: current.createdAt,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };
};

export const mergePreferenceSetsSelective = (
  current: PreferenceSet,
  incoming: PreferenceSet,
  acceptTitles: Set<string>
): PreferenceSet => {
  const acc = new Set<string>(Array.from(acceptTitles).map(normalize));
  const currentById = byId(current.topics);
  const currentByTitle = new Map<string, Topic>();
  for (const t of current.topics) currentByTitle.set(normalize(t.title), t);

  const mergedTopics: Topic[] = [];

  // Keep all current topics; if accepted and we have an incoming match, merge
  for (const t of current.topics) {
    let match = incoming.topics.find(x => x.id === t.id) || incoming.topics.find(x => normalize(x.title) === normalize(t.title));
    if (match && acc.has(normalize(match.title))) {
      mergedTopics.push(mergeTopic(t, match));
    } else {
      mergedTopics.push(t);
    }
  }

  // Add accepted truly-new incoming topics
  for (const inc of incoming.topics) {
    const existsById = currentById.has(inc.id);
    const existsByTitle = currentByTitle.has(normalize(inc.title));
    if (!existsById && !existsByTitle && acc.has(normalize(inc.title))) {
      mergedTopics.push(inc);
    }
  }

  return {
    version: 'tsb.v1',
    title: current.title,
    notes: current.notes,
    topics: mergedTopics,
    createdAt: current.createdAt,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };
};
