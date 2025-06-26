import React from 'react';
import { BORDER_RADIUS_MD, TRANSITION_MEDIUM } from '../theme';

/**
 * Props for the StatusDisplay component.
 */
interface StatusDisplayProps {
  /** The current status message to display. Null if no status message. */
  statusMessage: string | null;
  /** The current error message to display. Null if no error. Takes precedence over statusMessage. */
  errorMessage: string | null;
}

/**
 * Displays status or error messages related to the application's operation.
 * Error messages are prioritized if both status and error messages are provided.
 */
const StatusDisplay: React.FC<StatusDisplayProps> = React.memo(({ statusMessage, errorMessage }) => {
  const isRecording = statusMessage?.toLowerCase().includes('recording');
  return (
    <div 
      className={`p-3 ${isRecording ? 'bg-gradient-to-r from-red-900/80 via-slate-800 to-red-700/60 animate-pulse-slow' : 'bg-[var(--color-background-tertiary)]'} ${BORDER_RADIUS_MD} shadow-md min-h-[60px] flex flex-col justify-center ${TRANSITION_MEDIUM} text-sm relative overflow-hidden`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {errorMessage && (
        <div className="text-red-400"> 
          <span className="font-semibold">Error:</span> {errorMessage}
        </div>
      )}
      {statusMessage && !errorMessage && (
        <div className={`text-slate-300 flex items-center gap-3 ${isRecording ? 'font-bold text-lg tracking-wide' : ''}`}> 
          <span className="font-semibold">Status:</span>
          {isRecording ? (
            <>
              <span className="relative flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg ring-2 ring-red-400/60 mr-1" />
                <span className="text-red-300 drop-shadow-glow animate-glow">Recording...</span>
                {/* Animated waveform bars */}
                <span className="flex items-end ml-3 h-5">
                  <span className="w-1 h-2 bg-red-400 mx-0.5 rounded animate-wave1" />
                  <span className="w-1 h-4 bg-red-500 mx-0.5 rounded animate-wave2" />
                  <span className="w-1 h-3 bg-red-300 mx-0.5 rounded animate-wave3" />
                  <span className="w-1 h-5 bg-red-500 mx-0.5 rounded animate-wave4" />
                  <span className="w-1 h-2 bg-red-400 mx-0.5 rounded animate-wave5" />
                </span>
              </span>
            </>
          ) : (
            <span>{statusMessage}</span>
          )}
        </div>
      )}
      {!errorMessage && !statusMessage && (
        <div className="text-[var(--color-text-muted)] italic">System Idle.</div>
      )}
    </div>
  );
});

export default StatusDisplay;
