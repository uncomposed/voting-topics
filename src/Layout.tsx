import React from 'react';
import { App } from './App';

export const Layout: React.FC = () => {
  return (
    <div className="container">
      <header>
        <div className="brand">
          <div className="logo" aria-hidden="true"></div>
          <div>
            <div className="title">Voting Topics</div>
            <div className="muted">Draft, prioritize, and export your positions — locally, no account needed.</div>
          </div>
        </div>
        <div className="toolbar"></div>
      </header>

      <section className="panel">
        {/* Main app content and conditional header live inside App */}
        <App />
      </section>

      <aside className="panel" style={{ marginTop: 24 }}>
        <h2 className="panel-title">Template Info</h2>
        <div id="template-info"></div>
      </aside>

      <div className="footer">
        <div>Keyboard: <span className="kbd">Tab</span>/<span className="kbd">Shift+Tab</span>, stars: <span className="kbd">ArrowLeft</span>/<span className="kbd">ArrowRight</span></div>
        <div><a href="#" id="privacy-link">Privacy & disclaimers</a></div>
      </div>

      {/* Hidden social-card render target for JPEG export */}
      <div id="social-card" style={{ position:'absolute', left:-99999, top:-99999 }} aria-hidden="true"></div>
    </div>
  );
};
