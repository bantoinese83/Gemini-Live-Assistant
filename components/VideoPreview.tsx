import React, { useEffect, useRef } from 'react';
import { BORDER_RADIUS_LG, TRANSITION_MEDIUM } from '../theme';
import { VideoOff } from 'lucide-react';

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

  useEffect(() => {
    const currentVideoElement = videoRef.current;
    if (currentVideoElement) {
      if (mediaStream && isVideoEnabled) {
        // Only update srcObject if it has changed to prevent unnecessary re-renders or stream interruptions.
        if (currentVideoElement.srcObject !== mediaStream) {
          currentVideoElement.srcObject = mediaStream;
        }
        // Attempt to play the video. Autoplay might be blocked by browser policies.
        currentVideoElement.play().catch(error => {
          // Log autoplay failures as warnings; user interaction might be required.
          console.warn("VideoPreview: Autoplay was prevented or failed. This is often due to browser policies requiring user interaction before playback.", error);
        });
      } else {
        // If video is disabled or stream is null, clear srcObject to stop video and show placeholder.
        currentVideoElement.srcObject = null;
      }
    }
  }, [mediaStream, isVideoEnabled]); // Re-run effect if mediaStream or isVideoEnabled changes.

  const showPlaceholder = !isVideoEnabled || !mediaStream;

  return (
    <div className={`bg-[var(--color-background-secondary)] w-full h-full relative overflow-hidden ${BORDER_RADIUS_LG} ${TRANSITION_MEDIUM} shadow-inner`}>
      <video
        ref={videoRef}
        muted // User's own video preview should be muted to prevent feedback.
        playsInline // Essential for inline playback on iOS.
        className={`w-full h-full object-cover ${TRANSITION_MEDIUM} ${showPlaceholder ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        aria-label="User video preview"
        aria-hidden={showPlaceholder} // Hide from screen readers if placeholder is shown
      />
      {showPlaceholder && (
        <div 
            className={`absolute inset-0 flex flex-col justify-center items-center text-center text-[var(--color-text-muted)] bg-[var(--color-background-secondary)]/90 p-4 ${TRANSITION_MEDIUM} opacity-100`}
            role="status" // Indicates this content describes a status
        >
          <VideoOff size={48} className="mb-3 text-[var(--color-text-muted)] opacity-60" aria-hidden="true" />
          <span className="text-lg font-medium text-[var(--color-text-secondary)]">
            {!mediaStream ? "Waiting for Camera Access" : "Video Disabled"}
          </span>
          <span className="text-sm mt-1 max-w-xs">
            {!mediaStream ? "Please allow camera access via your browser's permissions." : "You can enable video using the controls."}
          </span>
        </div>
      )}
    </div>
  );
});

export default VideoPreview;
