
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
  return (
    <div 
      className={`p-3 bg-[var(--color-background-tertiary)] ${BORDER_RADIUS_MD} shadow-md min-h-[60px] flex flex-col justify-center ${TRANSITION_MEDIUM} text-sm`}
      role="status" // Indicates this region contains status information
      aria-live="polite" // Screen readers will announce changes politely
      aria-atomic="true" // Screen readers will announce the entire region when it changes
    >
      {errorMessage && (
        // Using direct Tailwind class for error color for clarity and prominence.
        <div className="text-red-400"> 
          <span className="font-semibold">Error:</span> {errorMessage}
        </div>
      )}
      {statusMessage && !errorMessage && (
        // Using direct Tailwind class for status message color.
        <div className="text-slate-300"> 
          <span className="font-semibold">Status:</span> {statusMessage}
        </div>
      )}
       {!errorMessage && !statusMessage && (
         // Default message when no specific status or error.
         <div className="text-[var(--color-text-muted)] italic">System Idle.</div>
       )}
    </div>
  );
});

export default StatusDisplay;
