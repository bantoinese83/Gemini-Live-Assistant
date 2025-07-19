import React from 'react';
import { Monitor, MonitorOff } from 'lucide-react';

interface ScreenShareButtonProps {
  isScreenSharing: boolean;
  onStartScreenSharing: () => Promise<void>;
  onStopScreenSharing: () => void;
  disabled?: boolean;
  className?: string;
}

const ScreenShareButton: React.FC<ScreenShareButtonProps> = ({
  isScreenSharing,
  onStartScreenSharing,
  onStopScreenSharing,
  disabled = false,
  className = ''
}) => {
  const handleClick = async () => {
    if (disabled) return;
    
    if (isScreenSharing) {
      onStopScreenSharing();
    } else {
      try {
        await onStartScreenSharing();
      } catch (error) {
        console.error('Screen sharing error:', error);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-12 h-12 rounded-full shadow-xl flex items-center justify-center 
        focus:outline-none focus:ring-4 transition-all duration-200
        hover-lift button-press focus-enhanced
        ${isScreenSharing 
          ? 'bg-[var(--color-accent-red)] hover:bg-[var(--color-accent-red-hover)] focus:ring-[var(--color-accent-red)]/30' 
          : 'bg-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue-hover)] focus:ring-[var(--color-accent-blue)]/30'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
      title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
    >
      {isScreenSharing ? (
        <MonitorOff size={24} className="text-white" />
      ) : (
        <Monitor size={24} className="text-white" />
      )}
    </button>
  );
};

export default ScreenShareButton; 