import React, { useState, useEffect, useCallback } from 'react';
import { Clock, HardDrive } from 'lucide-react';

interface SessionTimerProps {
  isRecording: boolean;
  sessionStartTime?: Date | null;
}

interface DiskSpaceInfo {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

const SessionTimer: React.FC<SessionTimerProps> = ({ isRecording, sessionStartTime }) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
  const [isLoadingDiskSpace, setIsLoadingDiskSpace] = useState<boolean>(false);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format disk space
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get disk space information
  const getDiskSpace = useCallback(async (): Promise<DiskSpaceInfo | null> => {
    try {
      // Check if the Storage API is available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage) {
          const total = estimate.quota;
          const used = estimate.usage;
          const available = total - used;
          const percentage = (used / total) * 100;
          
          return {
            total,
            used,
            available,
            percentage: Math.round(percentage)
          };
        }
      }
      
      // Fallback: try to get localStorage usage
      const localStorageSize = JSON.stringify(localStorage).length;
      const estimatedTotal = 5 * 1024 * 1024; // Estimate 5MB for localStorage
      const percentage = (localStorageSize / estimatedTotal) * 100;
      
      return {
        total: estimatedTotal,
        used: localStorageSize,
        available: estimatedTotal - localStorageSize,
        percentage: Math.round(percentage)
      };
    } catch (error) {
      console.warn('Could not get disk space info:', error);
      return null;
    }
  }, []);

  // Update disk space info
  const updateDiskSpace = useCallback(async () => {
    setIsLoadingDiskSpace(true);
    try {
      const spaceInfo = await getDiskSpace();
      setDiskSpace(spaceInfo);
    } catch (error) {
      console.error('Error getting disk space:', error);
    } finally {
      setIsLoadingDiskSpace(false);
    }
  }, [getDiskSpace]);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRecording && sessionStartTime) {
      const updateTimer = () => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      };

      updateTimer(); // Update immediately
      intervalId = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording, sessionStartTime]);

  // Update disk space periodically
  useEffect(() => {
    updateDiskSpace();
    
    const intervalId = setInterval(updateDiskSpace, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [updateDiskSpace]);

  // Get disk space color based on usage
  const getDiskSpaceColor = useCallback((percentage: number): string => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    if (percentage >= 50) return 'text-orange-500';
    return 'text-green-500';
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border-primary)]">
      {/* Session Timer */}
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-[var(--color-accent-blue)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Session Time:
        </span>
        <span className={`text-sm font-mono font-bold ${
          isRecording ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-secondary)]'
        }`}>
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Disk Space */}
      <div className="flex items-center gap-2">
        <HardDrive size={16} className="text-[var(--color-accent-green)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Storage:
        </span>
        {isLoadingDiskSpace ? (
          <span className="text-sm text-[var(--color-text-muted)]">Loading...</span>
        ) : diskSpace ? (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono ${
              getDiskSpaceColor(diskSpace.percentage)
            }`}>
              {formatBytes(diskSpace.used)} / {formatBytes(diskSpace.total)}
            </span>
            <div className="w-16 h-2 bg-[var(--color-border-primary)] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  diskSpace.percentage >= 90 ? 'bg-red-500' :
                  diskSpace.percentage >= 75 ? 'bg-yellow-500' :
                  diskSpace.percentage >= 50 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(diskSpace.percentage, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              getDiskSpaceColor(diskSpace.percentage)
            }`}>
              {diskSpace.percentage}%
            </span>
          </div>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">Unavailable</span>
        )}
      </div>
    </div>
  );
};

export default SessionTimer; 