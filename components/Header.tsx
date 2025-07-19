import React, { useState, useEffect } from 'react';
import { History, BarChart2, Settings, HelpCircle, Wifi, WifiOff, Clock, Activity } from 'lucide-react';
import ScreenSharePreview from './ScreenSharePreview';

// Google "G" logo component
const GoogleLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    aria-label="Google"
  >
    <path 
      fill="#4285F4" 
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path 
      fill="#34A853" 
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path 
      fill="#FBBC05" 
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path 
      fill="#EA4335" 
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface HeaderProps {
  onShowHistory: () => void;
  onToggleDashboard: () => void;
  showDashboard: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  isRecording?: boolean;
  sessionStartTime?: Date | null;
  currentPersona?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onShowHistory, 
  onToggleDashboard, 
  showDashboard, 
  isScreenSharing, 
  screenStream,
  isRecording = false,
  sessionStartTime,
  currentPersona = "Friendly Conversationalist"
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [showHelp, setShowHelp] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Calculate session duration
  const getSessionDuration = () => {
    if (!sessionStartTime) return '00:00:00';
    const diff = currentTime.getTime() - sessionStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="custom-header w-full flex flex-col bg-[var(--color-background-primary)] border-b-4 border-double border-[var(--color-border-primary)] shadow-lg">
      {/* Main Header Row */}
      <div className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-4">
          <span className="custom-logo text-4xl sm:text-6xl md:text-7xl font-extrabold uppercase tracking-tight relative select-none flex items-center gap-1">
            <GoogleLogo className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16" />
            <span>LA</span>
          </span>
          
          {/* App Description */}
          <div className="hidden md:flex flex-col ml-4">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Gemini Live Assistant</span>
            <span className="text-xs text-[var(--color-text-muted)]">AI-Powered Voice & Video Assistant</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-background-secondary)] border border-[var(--color-border-primary)]">
            {connectionStatus === 'online' ? (
              <Wifi size={14} className="text-[var(--color-accent-green)]" />
            ) : (
              <WifiOff size={14} className="text-[var(--color-accent-red)]" />
            )}
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {connectionStatus}
            </span>
          </div>

          {/* Current Time */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-background-secondary)] border border-[var(--color-border-primary)]">
            <Clock size={14} className="text-[var(--color-accent-blue)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>

          {/* Screen Share Preview */}
          <ScreenSharePreview
            screenStream={screenStream}
            isScreenSharing={isScreenSharing}
            className="hidden sm:block"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mr-4 sm:mr-8">
          <button
            className="w-12 h-12 rounded-full bg-[var(--color-accent-green)] shadow-xl flex items-center justify-center hover:bg-[var(--color-accent-green-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-blue)] transition-all duration-200 hover-lift button-press focus-enhanced"
            onClick={onShowHistory}
            aria-label="Show History"
            title="Show History (H)"
          >
            <History size={24} className="text-white" />
          </button>
          <button
            className="w-12 h-12 rounded-full bg-[var(--color-accent-blue)] shadow-xl flex items-center justify-center hover:bg-[var(--color-accent-blue-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-green)] transition-all duration-200 hover-lift button-press focus-enhanced"
            onClick={onToggleDashboard}
            aria-label={showDashboard ? 'Hide Analytics' : 'Show Analytics'}
            title={`${showDashboard ? 'Hide' : 'Show'} Analytics (A)`}
          >
            <BarChart2 size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Secondary Info Row */}
      <div className="flex flex-row items-center justify-between py-2 px-4 bg-[var(--color-background-secondary)] border-t border-[var(--color-border-primary)]">
        <div className="flex items-center gap-6">
          {/* Current Persona */}
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--color-accent-blue)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Persona: <span className="text-[var(--color-accent-blue)]">{currentPersona}</span>
            </span>
          </div>

          {/* Session Duration */}
          {isRecording && sessionStartTime && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[var(--color-accent-red)] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Session: <span className="text-[var(--color-accent-red)] font-mono">{getSessionDuration()}</span>
              </span>
            </div>
          )}

          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/20">
              <div className="w-2 h-2 bg-[var(--color-accent-red)] rounded-full animate-pulse" />
              <span className="text-xs font-medium text-[var(--color-accent-red)]">RECORDING</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-background-tertiary)] hover:bg-[var(--color-border-primary)] transition-colors duration-200 text-xs font-medium text-[var(--color-text-secondary)]"
            onClick={() => setShowHelp(!showHelp)}
            title="Help & Shortcuts"
          >
            <HelpCircle size={14} />
            Help
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-background-tertiary)] hover:bg-[var(--color-border-primary)] transition-colors duration-200 text-xs font-medium text-[var(--color-text-secondary)]"
            title="Settings"
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="px-4 py-3 bg-[var(--color-background-tertiary)] border-t border-[var(--color-border-primary)] animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div><kbd className="px-1 py-0.5 bg-white border rounded">Space</kbd> Start/Stop Recording</div>
                <div><kbd className="px-1 py-0.5 bg-white border rounded">V</kbd> Toggle Video</div>
                <div><kbd className="px-1 py-0.5 bg-white border rounded">S</kbd> Toggle Screen Share</div>
                <div><kbd className="px-1 py-0.5 bg-white border rounded">M</kbd> Mute/Unmute</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Quick Actions</h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• Click persona cards to switch AI personalities</div>
                <div>• Use volume sliders for audio control</div>
                <div>• Copy transcript text with hover buttons</div>
                <div>• Scroll transcripts with arrow keys</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Status Indicators</h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• <span className="text-[var(--color-accent-green)]">●</span> Online/Ready</div>
                <div>• <span className="text-[var(--color-accent-red)]">●</span> Recording/Error</div>
                <div>• <span className="text-[var(--color-accent-yellow)]">●</span> Processing</div>
                <div>• <span className="text-[var(--color-accent-blue)]">●</span> Connecting</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 