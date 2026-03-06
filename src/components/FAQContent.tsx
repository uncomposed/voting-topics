import React from 'react';

const faqEntries = [
  {
    q: 'What is the difference between topics and items?',
    a: 'Topics are the themes you prioritize. Items are the specific outcomes you care about, and one item can belong to more than one topic.',
  },
  {
    q: 'How does topic priority work now?',
    a: 'Topic priority is still a first-class rating. It tells the app how important that whole theme is to you, separately from the stars on individual items.',
  },
  {
    q: 'What is Quick Share?',
    a: 'Quick Share creates a compact link that only includes starter-backed topics and items. It keeps data local-first, but custom topics and items are not included.',
  },
  {
    q: 'What is Full Share?',
    a: 'Full Share exports a complete snapshot of your current data as JSON or PDF.',
  },
  {
    q: 'How private is this tool?',
    a: 'Your work stays local in the browser by default. There are no accounts, and Quick Share works by encoding starter-backed ratings in the URL instead of storing your data on a server.',
  },
  {
    q: 'How should I use AI imports?',
    a: 'Use the LLM tab to copy your schema and data, then paste returned JSON back into the app. If validation fails, the app shows a structured error list and a one-click raw error copy you can send back to the model.',
  },
  {
    q: 'How does the sample ballot relate to my topics?',
    a: 'You can link candidates and measures back to the topics and items that explain your choice, then export the result as a sample STAR ballot.',
  },
];

export const FAQContent: React.FC = () => (
  <div className="help-text">
    <h3 style={{ marginTop: 0 }}>Frequently Asked Questions</h3>
    {faqEntries.map((entry) => (
      <div key={entry.q} style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 6 }}>{entry.q}</h4>
        <p style={{ margin: 0 }}>{entry.a}</p>
      </div>
    ))}
  </div>
);
