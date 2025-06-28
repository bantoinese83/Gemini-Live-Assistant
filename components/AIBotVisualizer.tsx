import React from 'react';
import AIBot from './AIBot';
import useAIBotVisualization from '../hooks/useAIBotVisualization';

/**
 * Props for the AIBotVisualizer component.
 */
interface AIBotVisualizerProps {
  /** The global `AudioContext` instance. Required for the visualization hook. */
  audioContext: AudioContext | null;
  /** The `AudioNode` from which the AI assistant's audio is sourced (e.g., an output GainNode). Required for the visualization hook. */
  sourceNode: AudioNode | null;
  /** Boolean flag indicating if the AI assistant is currently speaking. Controls the active state of the visualization. */
  isAssistantSpeaking?: boolean;
}

/**
 * Renders the AI Bot (`<AIBot />`) within a themed container.
 * It utilizes the `useAIBotVisualization` hook, which handles the complex logic of
 * analyzing audio from the `sourceNode` and applying dynamic CSS custom properties
 * to `document.documentElement.style` to animate the bot when `isAssistantSpeaking` is true.
 * This component itself is primarily presentational.
 */
const AIBotVisualizer: React.FC<AIBotVisualizerProps> = React.memo(({
  audioContext,
  sourceNode,
  isAssistantSpeaking = false, // Default to false if not provided
}) => {
  // The useAIBotVisualization hook is responsible for the side effect of analyzing audio
  // and updating global CSS variables for the bot's animation.
  // It does not return values directly used for rendering by this component.
  useAIBotVisualization(audioContext, sourceNode, isAssistantSpeaking);

  const botStateLabel = isAssistantSpeaking ? 'AI bot is speaking' : 'AI bot is idle';

  return (
    // The 'ai-bot-container' class provides base styling and positioning for the bot.
    // This class and the bot's internal structure are defined in index.html's CSS.
    <div
      className={`ai-bot-container${isAssistantSpeaking ? ' is-speaking' : ''}`}
      role="img"
      aria-label={botStateLabel}
      tabIndex={0}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
    >
      <div className="ai-bot-morph-border" aria-hidden="true" />
      <AIBot />
    </div>
  );
});

export default AIBotVisualizer;
