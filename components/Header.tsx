import React, { useState } from 'react';
import { History, BarChart2, Settings, HelpCircle, Activity } from 'lucide-react';
import ScreenSharePreview from './ScreenSharePreview';
import AIRobotLogo from './AIRobotLogo';

interface HeaderProps {
  onShowHistory: () => void;
  onToggleDashboard: () => void;
  showDashboard: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  isRecording?: boolean;
  sessionStartTime?: Date | null;
  currentPersona?: string;
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onShowHistory, 
  onToggleDashboard, 
  showDashboard, 
  isScreenSharing, 
  screenStream,
  isRecording = false,
  sessionStartTime,
  currentPersona = "Friendly Conversationalist",
  onOpenSettings
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Calculate session duration
  const getSessionDuration = () => {
    if (!sessionStartTime) return '00:00:00';
    const diff = new Date().getTime() - sessionStartTime.getTime();
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
            <AIRobotLogo size="lg" className="sm:w-14 sm:h-14 md:w-16 md:h-16" />
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
            onClick={onOpenSettings}
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