import React from 'react';

interface Direction {
  text: string;
  stars: number;
}

interface SmartDirectionDotsProps {
  directions: Direction[];
  maxVisible?: number;
}

export const SmartDirectionDots: React.FC<SmartDirectionDotsProps> = ({ 
  directions, 
  maxVisible = 7 
}) => {
  if (directions.length === 0) {
    return null;
  }

  if (directions.length <= maxVisible) {
    // Show all directions if we can fit them
    return (
      <div className="direction-dots">
        {directions.map((direction, i) => (
          <span 
            key={i} 
            className={`direction-dot ${direction.stars > 0 ? 'rated' : 'unrated'}`}
            title={`${direction.stars}/5 stars`}
          >
            {direction.stars > 0 ? '●' : '○'}
          </span>
        ))}
      </div>
    );
  }

  // Handle case where we have more directions than can fit
  const ratedDirections = directions.filter(d => d.stars > 0);
  const unratedDirections = directions.filter(d => d.stars === 0);
  
  // Calculate how many of each type to show
  // Show filled first (left), then unfilled (right), with overflow bubbles at the end of each type
  const ratedToShow = Math.min(ratedDirections.length, Math.ceil(maxVisible / 2));
  const unratedToShow = Math.min(unratedDirections.length, maxVisible - ratedToShow - 2); // -2 for both count bubbles
  
  const dots: React.ReactNode[] = [];
  
  // Add rated direction dots first (left side)
  for (let i = 0; i < ratedToShow; i++) {
    dots.push(
      <span 
        key={`rated-${i}`} 
        className="direction-dot rated"
        title={`${ratedDirections[i].stars}/5 stars`}
      >
        ●
      </span>
    );
  }
  
  // Add count bubble for remaining rated directions (filled style) - rightmost of filled type
  const remainingRated = ratedDirections.length - ratedToShow;
  if (remainingRated > 1) {
    // Only show count bubble if there are 2+ remaining
    dots.push(
      <span 
        key="rated-count" 
        className="direction-dot rated count-bubble"
        title={`${remainingRated} more rated directions`}
      >
        {remainingRated}
      </span>
    );
  } else if (remainingRated === 1) {
    // Show the actual remaining rated direction as a dot
    dots.push(
      <span 
        key="rated-remaining" 
        className="direction-dot rated"
        title={`${ratedDirections[ratedToShow].stars}/5 stars`}
      >
        ●
      </span>
    );
  }
  
  // Add unrated direction dots (right side)
  for (let i = 0; i < unratedToShow; i++) {
    dots.push(
      <span 
        key={`unrated-${i}`} 
        className="direction-dot unrated"
        title="Unrated direction"
      >
        ○
      </span>
    );
  }
  
  // Add count bubble for remaining unrated directions (unfilled style) - rightmost of unfilled type
  const remainingUnrated = unratedDirections.length - unratedToShow;
  if (remainingUnrated > 1) {
    // Only show count bubble if there are 2+ remaining
    dots.push(
      <span 
        key="unrated-count" 
        className="direction-dot unrated count-bubble"
        title={`${remainingUnrated} more unrated directions`}
      >
        {remainingUnrated}
      </span>
    );
  } else if (remainingUnrated === 1) {
    // Show the actual remaining unrated direction as a dot
    dots.push(
      <span 
        key="unrated-remaining" 
        className="direction-dot unrated"
        title="Unrated direction"
      >
        ○
      </span>
    );
  }

  return (
    <div className="direction-dots">
      {dots}
    </div>
  );
};
