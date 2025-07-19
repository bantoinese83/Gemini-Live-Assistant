import React from 'react';
import { Play, Square, RotateCcw, Video, VideoOff, User2, Heart, Rocket, Smile, Laptop, Languages, Dumbbell, Mic, TrendingUp, BookOpen, Sparkles, Scale, Code } from 'lucide-react';
import Button from './common/Button';
import type { IconProps } from '../types'; // IconProps is used by Button for its icon elements
import { AI_PERSONA_PRESETS } from '../types';
import './PlayResetButton.css'; // (Create this CSS file for custom styles)
import './GooeyToggle.css'; // Add gooey toggle styles
import GooeySvgToggle from './GooeySvgToggle';
import GooeyScreenShareToggle from './GooeyScreenShareToggle';

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
  /** Indicates if screen sharing is currently active. */
  isScreenSharing: boolean;
  /** Callback function to start recording. */
  onStartRecording: () => void;
  /** Callback function to stop recording. */
  onStopRecording: () => void;
  /** Callback function to reset the session. */
  onResetSession: () => void;
  /** Callback function to toggle video enablement. Receives a boolean indicating the new desired state. */
  onToggleVideo: (enable: boolean) => void;
  /** Callback function to toggle screen sharing. Receives a boolean indicating the new desired state. */
  onToggleScreenShare: (enable: boolean) => void;
  selectedPersonaId: string;
  onPersonaChange: (personaId: string) => void;
}

// Persona icon mapping with Google brand colors
const personaIcons: Record<string, React.ReactNode> = {
  'interview-coach': <User2 size={28} className="mb-1 text-[#4285f4]" aria-label="Interview Coach" />, // Google Blue
  'dating-coach': <Heart size={28} className="mb-1 text-[#ea4335]" aria-label="Dating Coach" />, // Google Red
  'motivational-mentor': <Rocket size={28} className="mb-1 text-[#fbbc05]" aria-label="Motivational Mentor" />, // Google Yellow
  'friendly-conversationalist': <Smile size={28} className="mb-1 text-[#34a853]" aria-label="Friendly Conversationalist" />, // Google Green
  'tech-support-agent': <Laptop size={28} className="mb-1 text-[#4285f4]" aria-label="Tech Support Agent" />, // Google Blue
  'language-tutor': <Languages size={28} className="mb-1 text-[#34a853]" aria-label="Language Tutor" />, // Google Green
  'fitness-coach': <Dumbbell size={28} className="mb-1 text-[#fbbc05]" aria-label="Fitness Coach" />, // Google Yellow
  'standup-comedian': <Mic size={28} className="mb-1 text-[#ea4335]" aria-label="Standup Comedian" />, // Google Red
  'startup-advisor': <TrendingUp size={28} className="mb-1 text-[#34a853]" aria-label="Startup Advisor" />, // Google Green
  'storytelling-companion': <BookOpen size={28} className="mb-1 text-[#fbbc05]" aria-label="Storytelling Companion" />, // Google Yellow
  'mindfulness-guide': <Sparkles size={28} className="mb-1 text-[#34a853]" aria-label="Mindfulness Guide" />, // Google Green
  'debate-partner': <Scale size={28} className="mb-1 text-[#ea4335]" aria-label="Debate Partner" />, // Google Red
  'coding-buddy': <Code size={28} className="mb-1 text-[#4285f4]" aria-label="Coding Buddy" />, // Google Blue
};

/**
 * ControlPanel component provides UI controls for starting/stopping recording,
 * resetting the session, and toggling video.
 */
const ControlPanel: React.FC<ControlPanelProps> = React.memo(({
  isRecording,
  isInitialized,
  apiKeyMissing,
  isVideoEnabled,
  isScreenSharing,
  onStartRecording,
  onStopRecording,
  onResetSession,
  onToggleVideo,
  onToggleScreenShare,
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
            className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all duration-200 shadow-sm min-w-[120px] max-w-[160px] focus:outline-none focus:ring-2 focus:ring-accent-500/70 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] hover-lift button-press focus-enhanced ${selectedPersonaId === persona.id ? 'border-accent-500 ring-2 ring-accent-500/60 scale-105' : 'border-slate-600/40'}`}
            aria-pressed={selectedPersonaId === persona.id}
            aria-label={persona.name}
            onClick={() => {
              console.log('Persona clicked:', persona.id, persona.name);
              onPersonaChange(persona.id);
            }}
          >
            <span>{personaIcons[persona.id]}</span>
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
      {/* Start/Reset Button Row */}
      <div className="flex flex-row items-center justify-center gap-8 my-4">
        {/* Play Button */}
        <button
          type="button"
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isDisabledBySystem || (isRecording ? false : isRecording)}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
          className={`player-btn circle-btn button-press ${isRecording ? 'player-btn--stop' : 'player-btn--play'} ${isDisabledBySystem ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {/* Buffering ring (optional, only when recording) */}
          {isRecording && <span className="buffering-ring" />}
          {/* Play triangle (SVG for sharpness) */}
          {!isRecording && (
            <svg width="48" height="48" viewBox="0 0 48 48" className="triangle-svg" aria-hidden="true">
              <polygon points="18,12 38,24 18,36" fill="#fff" filter="url(#play-glow)" />
              <defs>
                <filter id="play-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#fff" floodOpacity="0.7" />
                </filter>
              </defs>
            </svg>
          )}
          {/* Stop icon (square) for recording state */}
          {isRecording && (
            <svg width="32" height="32" viewBox="0 0 32 32" className="stop-svg" aria-hidden="true">
              <rect x="8" y="8" width="16" height="16" rx="4" fill="#fff" />
            </svg>
          )}
        </button>
        {/* Reset Button */}
        <button
          type="button"
          onClick={onResetSession}
          disabled={isRecording || isDisabledBySystem}
          aria-label="Reset Session"
          title="Reset Session"
          className={`player-btn circle-btn player-btn--reset button-press ${isRecording || isDisabledBySystem ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="reset-icon-wrapper">
            <RotateCcw size={36} className="reset-icon strong-glow" aria-hidden="true" />
          </span>
        </button>
      </div>
      {/* Gooey Video Toggle Row */}
      <div className="flex items-center justify-between w-full py-2">
        <span className={`font-semibold text-base select-none transition-colors duration-300 ${isVideoEnabled ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-muted)]'}`}
          >
          {isVideoEnabled ? 'Video On' : 'Video Off'}
        </span>
        <GooeySvgToggle
          checked={isVideoEnabled}
          onChange={onToggleVideo}
          disabled={isDisabledBySystem}
          ariaLabel={isVideoEnabled ? 'Turn video off' : 'Turn video on'}
        />
      </div>
      {/* Gooey Screen Share Toggle Row */}
      <div className="flex items-center justify-between w-full py-2">
        <span className={`font-semibold text-base select-none transition-colors duration-300 ${isScreenSharing ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-muted)]'}`}
          >
          {isScreenSharing ? 'Screen Share On' : 'Screen Share Off'}
        </span>
        <GooeyScreenShareToggle
          checked={isScreenSharing}
          onChange={onToggleScreenShare}
          disabled={isDisabledBySystem}
          ariaLabel={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
        />
      </div>
    </div>
  );
});

export default ControlPanel;
