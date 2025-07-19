import React, { useEffect, useRef, useState } from 'react';
import { BORDER_RADIUS_LG, TRANSITION_MEDIUM } from '../theme';
import { VideoOff, Camera, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Props for the VideoPreview component.
 */
interface VideoPreviewProps {
  /** The MediaStream containing the video track to display. Null if no stream is available. */
  mediaStream: MediaStream | null;
  /** Boolean indicating if the video preview should be visible and playing. */
  isVideoEnabled: boolean;
}

/**
 * Displays a live video preview from the user's camera via a MediaStream.
 * Shows a placeholder if video is disabled or the stream is unavailable.
 */
const VideoPreview: React.FC<VideoPreviewProps> = React.memo(({ mediaStream, isVideoEnabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const currentVideoElement = videoRef.current;
    if (currentVideoElement) {
      if (mediaStream && isVideoEnabled) {
        setIsLoading(true);
        setHasError(false);
        
        // Only update srcObject if it has changed to prevent unnecessary re-renders or stream interruptions.
        if (currentVideoElement.srcObject !== mediaStream) {
          currentVideoElement.srcObject = mediaStream;
        }
        
        // Attempt to play the video. Autoplay might be blocked by browser policies.
        currentVideoElement.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(error => {
            // Log autoplay failures as warnings; user interaction might be required.
            console.warn("VideoPreview: Autoplay was prevented or failed. This is often due to browser policies requiring user interaction before playback.", error);
            setHasError(true);
            setIsLoading(false);
          });
      } else {
        // If video is disabled or stream is null, clear srcObject to stop video and show placeholder.
        currentVideoElement.srcObject = null;
        setIsPlaying(false);
        setIsLoading(false);
        setHasError(false);
      }
    }
  }, [mediaStream, isVideoEnabled]); // Re-run effect if mediaStream or isVideoEnabled changes.

  const showPlaceholder = !isVideoEnabled || !mediaStream || hasError;

  const getPlaceholderContent = () => {
    if (!mediaStream) {
      return {
        icon: <Camera size={48} className="mb-3 text-[var(--color-text-muted)] opacity-60" aria-hidden="true" />,
        title: "Waiting for Camera Access",
        description: "Please allow camera access via your browser's permissions.",
        status: "pending"
      };
    }
    
    if (hasError) {
      return {
        icon: <AlertCircle size={48} className="mb-3 text-[var(--color-accent-red)] opacity-60" aria-hidden="true" />,
        title: "Camera Access Error",
        description: "Unable to start video. Please check your camera permissions and try again.",
        status: "error"
      };
    }
    
    if (!isVideoEnabled) {
      return {
        icon: <VideoOff size={48} className="mb-3 text-[var(--color-text-muted)] opacity-60" aria-hidden="true" />,
        title: "Video Disabled",
        description: "You can enable video using the controls above.",
        status: "disabled"
      };
    }
    
    return {
      icon: <CheckCircle size={48} className="mb-3 text-[var(--color-accent-green)] opacity-60" aria-hidden="true" />,
      title: "Video Active",
      description: "Your camera is working properly.",
      status: "active"
    };
  };

  const placeholder = getPlaceholderContent();

  return (
    <div className={`bg-[var(--color-background-secondary)] w-full h-full relative overflow-hidden ${BORDER_RADIUS_LG} ${TRANSITION_MEDIUM} shadow-inner border border-[var(--color-border-primary)]/50`}>
      <video
        ref={videoRef}
        muted // User's own video preview should be muted to prevent feedback.
        playsInline // Essential for inline playback on iOS.
        className={`w-full h-full object-cover ${TRANSITION_MEDIUM} ${showPlaceholder ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        aria-label="User video preview"
        aria-hidden={showPlaceholder} // Hide from screen readers if placeholder is shown
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-secondary)]/90">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-sm text-[var(--color-text-secondary)]">Starting camera...</span>
          </div>
        </div>
      )}
      
      {showPlaceholder && !isLoading && (
        <div 
          className={`absolute inset-0 flex flex-col justify-center items-center text-center text-[var(--color-text-muted)] bg-[var(--color-background-secondary)]/95 p-4 ${TRANSITION_MEDIUM} opacity-100`}
          role="status" // Indicates this content describes a status
        >
          {placeholder.icon}
          <span className={`text-lg font-medium mb-2 ${
            placeholder.status === 'error' ? 'text-[var(--color-accent-red)]' :
            placeholder.status === 'active' ? 'text-[var(--color-accent-green)]' :
            'text-[var(--color-text-secondary)]'
          }`}>
            {placeholder.title}
          </span>
          <span className="text-sm max-w-xs leading-relaxed">
            {placeholder.description}
          </span>
          
          {/* Status indicator */}
          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${
            placeholder.status === 'error' ? 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]' :
            placeholder.status === 'active' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]' :
            placeholder.status === 'disabled' ? 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]' :
            'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
          }`}>
            {placeholder.status === 'error' ? 'Error' :
             placeholder.status === 'active' ? 'Active' :
             placeholder.status === 'disabled' ? 'Disabled' :
             'Pending'}
          </div>
        </div>
      )}
      
      {/* Video status indicator when playing */}
      {isPlaying && !showPlaceholder && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <div className="w-2 h-2 bg-[var(--color-accent-green)] rounded-full animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
});

export default VideoPreview;
