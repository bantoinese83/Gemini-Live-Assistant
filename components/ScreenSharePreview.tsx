import React, { useEffect, useRef } from 'react';

interface ScreenSharePreviewProps {
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  className?: string;
}

const ScreenSharePreview: React.FC<ScreenSharePreviewProps> = ({
  screenStream,
  isScreenSharing,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && screenStream && isScreenSharing) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(error => {
        console.warn('Failed to play screen preview video:', error);
      });
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [screenStream, isScreenSharing]);

  if (!isScreenSharing || !screenStream) {
    return null;
  }

  return (
    <div className={`
      relative rounded-lg overflow-hidden border-2 border-[var(--color-accent-blue)] 
      shadow-lg bg-[var(--color-background-secondary)]
      ${className}
    `}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        style={{ 
          width: '120px', 
          height: '67.5px', // 16:9 aspect ratio
          minWidth: '120px',
          minHeight: '67.5px'
        }}
      />
      {/* Screen sharing indicator */}
      <div className="absolute top-1 left-1 bg-[var(--color-accent-red)] text-white text-xs px-1 py-0.5 rounded-sm font-medium">
        LIVE
      </div>
      {/* Screen sharing icon overlay */}
      <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1">
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="text-white"
        >
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 1v2h8v-2l-1-1h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10z"/>
        </svg>
      </div>
    </div>
  );
};

export default ScreenSharePreview; 