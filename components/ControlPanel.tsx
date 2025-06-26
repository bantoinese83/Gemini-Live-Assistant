import React from 'react';
import { PlayIcon, StopIcon, ResetIcon, VideoOnIcon, VideoOffIcon } from './icons';
import Button from './common/Button';
import type { IconProps } from '../types'; // IconProps is used by Button for its icon elements
import { AI_PERSONA_PRESETS } from '../types';

/**
 * Props for the ControlPanel component.
 */
interface ControlPanelProps {
  /** Indicates if recording is currently active. */
  isRecording: boolean;
  /** Indicates if the Gemini Live service is initialized. */
  isInitialized: boolean;
  /** Indicates if the API key is missing. */
  apiKeyMissing: boolean;
  /** Indicates if video is currently enabled by the user. */
  isVideoEnabled: boolean;
  /** Callback function to start recording. */
  onStartRecording: () => void;
  /** Callback function to stop recording. */
  onStopRecording: () => void;
  /** Callback function to reset the session. */
  onResetSession: () => void;
  /** Callback function to toggle video enablement. Receives a boolean indicating the new desired state. */
  onToggleVideo: (enable: boolean) => void;
  selectedPersonaId: string;
  onPersonaChange: (personaId: string) => void;
}

/**
 * ControlPanel component provides UI controls for starting/stopping recording,
 * resetting the session, and toggling video.
 */
const ControlPanel: React.FC<ControlPanelProps> = React.memo(({
  isRecording,
  isInitialized,
  apiKeyMissing,
  isVideoEnabled,
  onStartRecording,
  onStopRecording,
  onResetSession,
  onToggleVideo,
  selectedPersonaId,
  onPersonaChange,
}) => {
  // Common disabled state for most buttons
  const isDisabledBySystem = !isInitialized || apiKeyMissing;
  
  // Common props for full-width buttons in this panel
  const commonButtonProps = { size: 'md', className: 'w-full' } as const;
  
  // Standard size for icons within buttons
  const iconProps: IconProps = { size: 20, "aria-hidden": true }; // Icons are decorative with button text

  // Persona Picker
  const renderPersonaPicker = () => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-2">AI Persona</label>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {AI_PERSONA_PRESETS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all shadow-sm min-w-[120px] max-w-[160px] focus:outline-none focus:ring-2 focus:ring-accent-500/70 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] ${selectedPersonaId === persona.id ? 'border-accent-500 ring-2 ring-accent-500/60 scale-105' : 'border-slate-600/40'}`}
            aria-pressed={selectedPersonaId === persona.id}
            aria-label={persona.name}
            onClick={() => onPersonaChange(persona.id)}
          >
            <span className="text-2xl mb-1">{persona.emoji}</span>
            <span className="font-semibold text-sm mb-0.5 text-accent-400">{persona.name}</span>
            <span className="text-xs text-slate-400 text-center leading-tight">{persona.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 p-4 bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl border border-[var(--color-border-primary)] max-w-md mx-auto transition-all duration-300">
      {renderPersonaPicker()}
      <hr className="my-2 border-[var(--color-border-primary)] opacity-40" />
      <div className="grid grid-cols-2 gap-4">
        <Button
          {...commonButtonProps}
          variant="success"
          onClick={onStartRecording}
          disabled={isRecording || isDisabledBySystem}
          leftIcon={<PlayIcon {...iconProps} />}
          aria-label="Start Recording"
          aria-pressed={isRecording}
          className="w-full transition-transform duration-150 hover:scale-105 focus:scale-105 shadow-md"
        >
          Start
        </Button>
        <Button
          {...commonButtonProps}
          variant="danger"
          onClick={onStopRecording}
          disabled={!isRecording || isDisabledBySystem}
          leftIcon={<StopIcon {...iconProps} />}
          aria-label="Stop Recording"
          className="w-full transition-transform duration-150 hover:scale-105 focus:scale-105 shadow-md"
        >
          Stop
        </Button>
      </div>
      <Button
        {...commonButtonProps}
        variant={isVideoEnabled ? 'primary' : 'secondary'}
        onClick={() => onToggleVideo(!isVideoEnabled)}
        disabled={isDisabledBySystem}
        leftIcon={isVideoEnabled ? <VideoOnIcon {...iconProps} /> : <VideoOffIcon {...iconProps} />}
        aria-pressed={isVideoEnabled}
        aria-label={isVideoEnabled ? "Turn Video Off" : "Turn Video On"}
        className="w-full transition-transform duration-150 hover:scale-105 focus:scale-105 shadow-md"
      >
        {isVideoEnabled ? 'Video On' : 'Video Off'}
      </Button>
      <Button
        {...commonButtonProps}
        variant="warning"
        onClick={onResetSession}
        disabled={isRecording || isDisabledBySystem}
        leftIcon={<ResetIcon {...iconProps} />}
        aria-label="Reset Session"
        className="w-full transition-transform duration-150 hover:scale-105 focus:scale-105 shadow-md"
      >
        Reset Session
      </Button>
    </div>
  );
});

export default ControlPanel;
