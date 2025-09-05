import React from 'react';
import { useStore } from '../../store';
import { exportBallotJSON, exportBallotPDF, exportBallotJPEG } from '../../exporters';

export const BallotPreview: React.FC = () => {
  const currentBallot = useStore(state => state.currentBallot);

  if (!currentBallot) {
    return <div>No ballot found</div>;
  }

  const { election, offices, measures } = currentBallot;
  
  // Check for unselected candidates
  const unselectedOffices = offices.filter(office => 
    office.candidates.length > 0 && !office.selectedCandidateId
  );

  return (
    <div className="ballot-preview">
      <div className="ballot-preview-header">
        <h2>Ballot Preview</h2>
        <p>Review your sample ballot before exporting</p>
        {unselectedOffices.length > 0 && (
          <div className="ballot-warning">
            ⚠️ You have {unselectedOffices.length} office{unselectedOffices.length > 1 ? 's' : ''} without selected candidates. 
            Select candidates to ensure your ballot export is complete.
          </div>
        )}
      </div>

      <div className="ballot-preview-content">
        <div className="ballot-header-preview">
          <h1 className="ballot-title">{currentBallot.title}</h1>
          
          <div className="election-info-preview">
            <div className="election-details">
              <h2>{election.name}</h2>
              <div className="election-meta">
                <span className="election-date">{new Date(election.date).toLocaleDateString()}</span>
                <span className="election-location">{election.location}</span>
                <span className="election-type">{election.type.charAt(0).toUpperCase() + election.type.slice(1)} Election</span>
              </div>
              <p className="election-jurisdiction">{election.jurisdiction}</p>
            </div>
          </div>
        </div>

        {offices.length > 0 && (
          <div className="offices-preview">
            <h2>Offices</h2>
            {offices.map((office) => (
              <div key={office.id} className="office-preview">
                <h3>{office.title}</h3>
                {office.description && (
                  <p className="office-description">{office.description}</p>
                )}
                
                <div className="candidates-preview">
                  {office.candidates.map((candidate) => {
                    const isSelected = office.selectedCandidateId === candidate.id;
                    return (
                      <div 
                        key={candidate.id} 
                        className={`candidate-preview ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="candidate-top">
                          <span className="candidate-name">{candidate.name}</span>
                          {candidate.party && (
                            <span className="candidate-party">({candidate.party})</span>
                          )}
                        </div>
                        <div className="candidate-bottom">
                          {isSelected && (
                            <span className="selected-check" aria-label="Selected" title="Selected">✓</span>
                          )}
                          {candidate.description && (
                            <span className="candidate-description-inline">{candidate.description}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!office.selectedCandidateId && office.candidates.length > 0 && (
                    <div className="unselected-warning">
                      ⚠️ No candidate selected for this office
                    </div>
                  )}
                </div>

                {office.selectedCandidateId && office.reasoning.length > 0 && (
                  <div className="reasoning-preview">
                    <h4>Reasoning for Office:</h4>
                    <ul>
                      {office.reasoning.map((reasoning, index) => {
                        // Find the topic for display
                        const topic = useStore.getState().topics.find(t => t.id === reasoning.topicId);
                        const topicTitle = topic?.title || 'Unknown Topic';
                        
                        return (
                          <li key={index}>
                            <strong>{topicTitle}</strong> ({reasoning.weight}/5): {reasoning.relevance}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {measures.length > 0 && (
          <div className="measures-preview">
            <h2>Ballot Measures</h2>
            {measures.map((measure) => (
              <div key={measure.id} className="measure-preview">
                <h3>{measure.title}</h3>
                {measure.description && (
                  <p className="measure-description">{measure.description}</p>
                )}
                
                {measure.position && (
                  <div className="measure-position-preview">
                    <strong>Your Position: {measure.position.toUpperCase()}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {offices.length === 0 && measures.length === 0 && (
          <div className="empty-ballot">
            <p>Your ballot is empty. Add offices and measures to see them here.</p>
          </div>
        )}
      </div>

      <div className="ballot-preview-actions">
        <button 
          onClick={() => {
            try {
              exportBallotJSON();
            } catch (e: unknown) {
              alert(e instanceof Error ? e.message : String(e));
            }
          }}
          className="btn primary"
        >
          Export JSON
        </button>
        <button 
          onClick={() => {
            exportBallotPDF().catch((e: unknown) => {
              alert(e instanceof Error ? e.message : String(e));
            });
          }}
          className="btn primary"
        >
          Export PDF
        </button>
        <button 
          onClick={() => {
            exportBallotJPEG().catch((e: unknown) => {
              alert(e instanceof Error ? e.message : String(e));
            });
          }}
          className="btn primary"
        >
          Export JPEG
        </button>
      </div>
    </div>
  );
};
