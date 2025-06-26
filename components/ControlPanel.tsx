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
      <div className="w-full">
        <Button
          {...commonButtonProps}
          variant={isRecording ? 'danger' : 'success'}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isDisabledBySystem || (isRecording ? false : isRecording)}
          leftIcon={isRecording ? <StopIcon {...iconProps} /> : <PlayIcon {...iconProps} />}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          aria-pressed={isRecording}
          className="w-full transition-transform duration-150 hover:scale-105 focus:scale-105 shadow-md"
        >
          {isRecording ? 'Stop' : 'Start'}
        </Button>
      </div>
      <div className="flex items-center justify-between w-full py-2">
        <span className="font-medium text-sm text-[var(--color-text-primary)] select-none">
          {isVideoEnabled ? 'Video On' : 'Video Off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isVideoEnabled}
          tabIndex={0}
          disabled={isDisabledBySystem}
          onClick={() => onToggleVideo(!isVideoEnabled)}
          className={`relative inline-flex h-9 w-16 rounded-full border-2 border-[var(--color-border-primary)] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent-500/70 shadow-md
            ${isVideoEnabled ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-background-tertiary)]'}
            ${isDisabledBySystem ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute left-1 top-1 flex items-center justify-center h-7 w-7 rounded-full bg-white shadow-lg transition-transform duration-300
              ${isVideoEnabled ? 'translate-x-7' : 'translate-x-0'}`}
          >
            {isVideoEnabled ? (
              <VideoOnIcon size={22} className="text-[var(--color-accent-teal)] transition-colors duration-300" />
            ) : (
              <VideoOffIcon size={22} className="text-slate-400 transition-colors duration-300" />
            )}
          </span>
        </button>
      </div>
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
