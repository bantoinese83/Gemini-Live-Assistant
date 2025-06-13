
import React from 'react';
import { PlayIcon, StopIcon, ResetIcon, VideoOnIcon, VideoOffIcon } from './icons';
import Button from './common/Button';
import type { IconProps } from '../types'; // IconProps is used by Button for its icon elements

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
}) => {
  // Common disabled state for most buttons
  const isDisabledBySystem = !isInitialized || apiKeyMissing;
  
  // Common props for full-width buttons in this panel
  const commonButtonProps = { size: 'md', className: 'w-full' } as const;
  
  // Standard size for icons within buttons
  const iconProps: IconProps = { size: 20, "aria-hidden": true }; // Icons are decorative with button text

  return (
    <div className="space-y-3 p-1">
      <div className="grid grid-cols-2 gap-3">
        <Button
          {...commonButtonProps}
          variant="success"
          onClick={onStartRecording}
          disabled={isRecording || isDisabledBySystem}
          leftIcon={<PlayIcon {...iconProps} />}
          aria-label="Start Recording"
          aria-pressed={isRecording}
        >
          Start
        </Button>
        <Button
          {...commonButtonProps}
          variant="danger"
          onClick={onStopRecording}
          disabled={!isRecording || isDisabledBySystem} // Only enabled if currently recording
          leftIcon={<StopIcon {...iconProps} />}
          aria-label="Stop Recording"
        >
          Stop
        </Button>
      </div>
      <Button
        {...commonButtonProps}
        variant={isVideoEnabled ? 'primary' : 'secondary'} // Use primary when active, secondary when inactive
        onClick={() => onToggleVideo(!isVideoEnabled)}
        disabled={isDisabledBySystem}
        leftIcon={isVideoEnabled ? <VideoOnIcon {...iconProps} /> : <VideoOffIcon {...iconProps} />}
        aria-pressed={isVideoEnabled} // Indicates current state of the toggle
        aria-label={isVideoEnabled ? "Turn Video Off" : "Turn Video On"}
      >
        {isVideoEnabled ? 'Video On' : 'Video Off'}
      </Button>
      <Button
        {...commonButtonProps}
        variant="warning"
        onClick={onResetSession}
        disabled={isRecording || isDisabledBySystem} // Disable reset if recording or system not ready
        leftIcon={<ResetIcon {...iconProps} />}
        aria-label="Reset Session"
      >
        Reset Session
      </Button>
    </div>
  );
});

export default ControlPanel;
