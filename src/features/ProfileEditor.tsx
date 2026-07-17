import { StarsInput } from '../components/StarsInput';
import type { TopicProfile } from '../domain/schema';

interface Props {
  profile: TopicProfile;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { title?: string; category?: string; stars?: number }) => number;
}

export function ProfileEditor({ profile, onAdd, onRemove, onUpdate }: Props) {
  return (
    <main className="page" id="main">
      <div className="page-heading">
        <p className="eyebrow">Capture · reusable across elections</p>
        <h1>Your topic profile</h1>
        <p>Write specific, directional outcomes without prescribing a solution. Stars mean <strong>how much you care</strong>. Categories only help you scan; they never affect a calculation.</p>
      </div>
      <div className="topic-list">
        {profile.topics.map((topic) => (
          <article className="card topic-card" key={topic.id}>
            <label>Specific outcome
              <textarea
                defaultValue={topic.title}
                onBlur={(event) => {
                  const next = event.currentTarget.value.trim();
                  if (next && next !== topic.title) {
                    const invalidated = onUpdate(topic.id, { title: next });
                    if (invalidated) window.alert(`${invalidated} evidence assessments were invalidated because the topic meaning changed.`);
                  }
                }}
              />
            </label>
            <label>Category (presentation only)
              <input defaultValue={topic.category ?? ''} onBlur={(event) => onUpdate(topic.id, { category: event.currentTarget.value.trim() || undefined })} />
            </label>
            <StarsInput label="My importance" value={topic.stars} onChange={(stars) => onUpdate(topic.id, { stars })} />
            <button className="button button-quiet danger" onClick={() => onRemove(topic.id)} type="button">Remove topic</button>
          </article>
        ))}
      </div>
      <button className="button button-secondary" onClick={onAdd} type="button">Add a topic</button>
    </main>
  );
}
