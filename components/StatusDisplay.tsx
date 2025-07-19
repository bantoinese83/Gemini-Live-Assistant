import React, { useEffect, useRef } from 'react';
import { BORDER_RADIUS_MD, TRANSITION_MEDIUM } from '../theme';
import { CheckCircle, Mic, LoaderCircle, AlertTriangle, RefreshCcw, Wifi, WifiOff } from 'lucide-react';

export type StatusType = 'idle' | 'recording' | 'processing' | 'error' | 'connecting';

/**
 * Props for the StatusDisplay component.
 */
interface StatusDisplayProps {
  /** The current status message to display. Null if no status message. */
  statusMessage: string | null;
  /** The current error message to display. Null if no error. Takes precedence over statusMessage. */
  errorMessage: string | null;
  isSaving?: boolean;
  statusType?: StatusType;
  onTimeout?: () => void;
}

const statusIcons: Record<StatusType, React.ReactNode> = {
  idle: <CheckCircle size={20} className="text-[var(--color-accent-green)] mr-2" aria-label="Ready" />,
  recording: <Mic size={20} className="text-[var(--color-accent-red)] mr-2 animate-pulse" aria-label="Recording" />,
  processing: <LoaderCircle size={20} className="text-[var(--color-accent-yellow)] mr-2 animate-spin-slow" aria-label="Processing" />,
  error: <AlertTriangle size={20} className="text-[var(--color-accent-red)] mr-2" aria-label="Error" />,
  connecting: <RefreshCcw size={20} className="text-[var(--color-accent-blue)] mr-2 animate-spin-slow" aria-label="Connecting" />,
};

const getStatusType = (statusMessage: string | null, errorMessage: string | null, isSaving?: boolean): StatusType => {
  if (errorMessage) return 'error';
  if (isSaving || statusMessage?.toLowerCase().includes('saving') || statusMessage?.toLowerCase().includes('processing')) return 'processing';
  if (statusMessage?.toLowerCase().includes('recording')) return 'recording';
  if (statusMessage?.toLowerCase().includes('connecting') || statusMessage?.toLowerCase().includes('initializing')) return 'connecting';
  return 'idle';
};

/**
 * Displays status or error messages related to the application's operation.
 * Error messages are prioritized if both status and error messages are provided.
 */
const StatusDisplay: React.FC<StatusDisplayProps> = React.memo(({ statusMessage, errorMessage, isSaving, statusType, onTimeout }) => {
  const computedType = statusType || getStatusType(statusMessage, errorMessage, isSaving);
  const [show, setShow] = React.useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<'online' | 'offline'>('online');

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timeout for lingering processing or error
  useEffect(() => {
    if (computedType === 'processing' || computedType === 'error') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShow(false);
        if (onTimeout) onTimeout();
      }, 10000); // 10 seconds
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setShow(true);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [computedType, onTimeout]);

  // Enhanced status messages
  const getEnhancedStatusMessage = () => {
    if (errorMessage) return errorMessage;
    if (statusMessage) return statusMessage;
    
    switch (computedType) {
      case 'idle':
        return 'Ready for your next session';
      case 'recording':
        return 'Recording in progress...';
      case 'processing':
        return 'Processing your request...';
      case 'connecting':
        return 'Connecting to AI service...';
      default:
        return 'Ready for your next session';
    }
  };

  // Fade/slide transition
  return (
    <div
      className={`transition-all duration-500 ease-in-out transform ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} p-4 ${computedType === 'recording' ? 'bg-gradient-to-r from-[var(--color-accent-red)]/20 via-[var(--color-background-secondary)] to-[var(--color-accent-red)]/10 animate-pulse-slow' : 'bg-[var(--color-background-secondary)]'} ${BORDER_RADIUS_MD} shadow-md min-h-[70px] flex flex-col justify-center ${TRANSITION_MEDIUM} text-sm relative overflow-hidden border border-[var(--color-border-primary)] hover-lift`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {connectionStatus === 'online' ? (
          <Wifi size={12} className="text-[var(--color-accent-green)]" />
        ) : (
          <WifiOff size={12} className="text-[var(--color-accent-red)]" />
        )}
        <span className="text-xs text-[var(--color-text-secondary)]">
          {connectionStatus}
        </span>
      </div>

      {errorMessage && (
        <div className="text-[var(--color-accent-red)] flex items-center" role="alert">
          {statusIcons.error}
          <div className="flex-1">
            <span className="font-semibold">Error:</span> {errorMessage}
          </div>
        </div>
      )}
      
      {statusMessage && !errorMessage && (
        <div className={`text-[var(--color-text-primary)] flex items-center gap-3 ${computedType === 'recording' ? 'font-bold text-lg tracking-wide' : ''}`}> 
          {statusIcons[computedType]}
          <div className="flex-1">
            <span className="font-semibold text-[var(--color-text-secondary)]">Status:</span>
            {computedType === 'recording' ? (
              <div className="flex items-center gap-3">
                <span className="relative flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg ring-2 ring-red-400/60 mr-1" />
                  <span className="text-red-300 drop-shadow-glow animate-glow">Recording...</span>
                  {/* Enhanced animated waveform bars */}
                  <span className="flex items-end ml-3 h-5">
                    <span className="w-1 h-2 bg-red-400 mx-0.5 rounded animate-wave1" />
                    <span className="w-1 h-4 bg-red-500 mx-0.5 rounded animate-wave2" />
                    <span className="w-1 h-3 bg-red-300 mx-0.5 rounded animate-wave3" />
                    <span className="w-1 h-5 bg-red-500 mx-0.5 rounded animate-wave4" />
                    <span className="w-1 h-2 bg-red-400 mx-0.5 rounded animate-wave5" />
                  </span>
                </span>
              </div>
            ) : computedType === 'processing' ? (
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-accent-yellow)] animate-pulse">Processing...</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-3 bg-[var(--color-accent-yellow)] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-3 bg-[var(--color-accent-yellow)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-3 bg-[var(--color-accent-yellow)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : computedType === 'idle' ? (
              <span className="text-[var(--color-accent-green)]">Ready for your next session.</span>
            ) : computedType === 'connecting' ? (
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-accent-blue)]">Connecting...</span>
                <div className="w-4 h-4 border-2 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <span>{statusMessage}</span>
            )}
          </div>
        </div>
      )}
      
      {!errorMessage && !statusMessage && (
        <div className="text-[var(--color-text-secondary)] italic flex items-center">
          {statusIcons.idle} 
          <span>{getEnhancedStatusMessage()}</span>
        </div>
      )}

      {/* Progress bar for processing states */}
      {(computedType === 'processing' || computedType === 'connecting') && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-background-tertiary)]">
          <div className={`h-full bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-green)] animate-pulse rounded-full`} 
               style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
});

export default StatusDisplay;
