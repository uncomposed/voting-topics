import React, { useState } from 'react';

interface GettingStartedGuideProps {
  onClose: () => void;
}

export const GettingStartedGuide: React.FC<GettingStartedGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Voting Topics Builder",
      content: (
        <div>
          <p>This tool helps you think through your political preferences systematically and create a sample ballot based on your values.</p>
          <div style={{ background: 'rgba(139, 211, 255, 0.1)', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
            <strong>⏱️ Time Estimate:</strong> 15-30 minutes for a complete preference set
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Add Topics (5-10 minutes)",
      content: (
        <div>
          <p>Start by adding topics that matter to you. You can:</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Choose from our starter pack of common topics</li>
            <li>Create your own custom topics</li>
            <li>Focus on 3-7 topics for best results</li>
          </ul>
          <div style={{ background: 'rgba(100, 255, 161, 0.1)', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
            <strong>💡 Tip:</strong> Think about what issues would most influence your vote
          </div>
        </div>
      )
    },
    {
      title: "Step 2: Add Directions (10-15 minutes)",
      content: (
        <div>
          <p>For each topic, add specific directions - the outcomes you want to see:</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Be specific: "Reduce gun violence" not just "Gun policy"</li>
            <li>Add 2-5 directions per topic</li>
            <li>Include both positive and negative outcomes</li>
          </ul>
          <div style={{ background: 'rgba(255, 209, 102, 0.1)', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
            <strong>🎯 Goal:</strong> Capture the nuances of your views
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Rate Importance (5-10 minutes)",
      content: (
        <div>
          <p>Rate each direction's importance using the star system:</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>0 stars = Skip this direction</li>
            <li>1-2 stars = Low importance</li>
            <li>3-4 stars = High importance</li>
            <li>5 stars = Critical importance</li>
          </ul>
          <div style={{ background: 'rgba(139, 211, 255, 0.1)', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
            <strong>📊 Insight:</strong> The tool will show how differentiated your preferences are
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Create Your Ballot (5 minutes)",
      content: (
        <div>
          <p>Once your preferences are set, you can:</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Create a sample ballot for upcoming elections</li>
            <li>Export your preferences as JSON or PDF</li>
            <li>Compare different preference sets</li>
          </ul>
          <div style={{ background: 'rgba(100, 255, 161, 0.1)', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
            <strong>🎉 Result:</strong> A clear, organized view of your political priorities
          </div>
        </div>
      )
    }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal" style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>🚀 Getting Started</h2>
          <button 
            onClick={onClose}
            className="btn ghost"
            style={{ padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>
            {steps[currentStep].title}
          </h3>
          {steps[currentStep].content}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: index === currentStep ? 'var(--accent)' : 'var(--border)'
                }}
              />
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button onClick={handlePrev} className="btn ghost">
                ← Previous
              </button>
            )}
            <button onClick={handleNext} className="btn primary">
              {currentStep === steps.length - 1 ? 'Get Started!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
