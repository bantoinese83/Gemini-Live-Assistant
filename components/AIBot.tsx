
import React from 'react';

/**
 * A stateless presentational component representing the visual structure of the AI Bot.
 * The actual animation and behavior are controlled by CSS custom properties updated
 * by the `useAIBotVisualization` hook and applied via styles in `index.html`.
 * This component simply provides the DOM structure.
 */
const AIBot: React.FC = () => {
  return (
    <div className="ai-bot"> {/* Base class for scaling and positioning */}
      <div className="head"> {/* Bot's head element */}
        <div className="face"> {/* Bot's face container */}
          <div className="eyes"></div> {/* Placeholder for eyes, styled by CSS */}
          <div className="mouth"></div> {/* Placeholder for mouth, styled by CSS */}
        </div>
      </div>
    </div>
  );
};

export default AIBot;
