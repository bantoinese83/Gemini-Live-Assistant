import React from 'react';

export interface AudioDataPart {
  data: string; // Base64 encoded string
  mimeType: string;
}

// Callbacks for GeminiLiveAI Service
export interface GeminiLiveAICallbacks {
  onStatusUpdate: (status: string) => void;
  onErrorUpdate: (error: string) => void;
  onRecordingStateChange: (isRecording: boolean) => void;
  onUserTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onModelTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onMediaStreamAvailable: (stream: MediaStream | null) => void;
}

// Return type for the useGeminiLive hook
export interface UseGeminiLiveReturn {
  isInitialized: boolean;
  isRecording: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  inputAudioContext: AudioContext | null;
  inputGainNode: GainNode | null;
  outputAudioContext: AudioContext | null;
  outputGainNode: GainNode | null;
  mediaStream: MediaStream | null;
  apiKeyMissing: boolean;
  startRecording: (initialVideoState?: boolean) => Promise<void>;
  stopRecording: () => void;
  resetSession: () => void;
  userTranscript: string;
  userTranscriptIsFinal: boolean;
  modelTranscript: string;
  modelTranscriptIsFinal: boolean;
  setVideoTrackEnabled?: (enable: boolean) => void;
}

// Props for generic Icon components
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

// Props for the common Button component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactElement<IconProps>;
  rightIcon?: React.ReactElement<IconProps>;
  isLoading?: boolean;
}

// CSS custom property style object for AI Bot
export interface AIBotStyles {
  '--mh'?: string | number;
  '--mw'?: string | number;
  '--fx'?: string | number;
  '--erx'?: string | number;
  '--elh'?: string | number;
  '--erh'?: string | number;
  '--ealw'?: string | number;
  '--earw'?: string | number;
  [key: string]: string | number | undefined; // Allow other custom properties
}
