import React from 'react';
import { z } from 'zod';

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

export type AIPersonaPreset = {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  systemInstruction: string;
};

export const AI_PERSONA_PRESETS: AIPersonaPreset[] = [
  {
    id: 'interview-coach',
    name: 'Interview Coach',
    description: 'Simulates a professional interviewer. Gives feedback and asks tough questions to help you ace your next job interview.',
    emoji: '🧑‍💼',
    systemInstruction: `You are a professional job interview coach. Your job is to simulate a real interviewer, ask challenging and relevant questions, and provide detailed, constructive feedback after each answer. Be supportive but honest. Use a formal, encouraging tone.

Example:
Interviewer: Tell me about yourself.
Candidate: [user answer]
Interviewer: Good answer! You highlighted your experience, but try to be more concise and mention a key achievement next time.`
  },
  {
    id: 'dating-coach',
    name: 'Dating Coach',
    description: 'Acts as a supportive dating coach. Practices conversations, gives tips, and helps you build confidence for real dates.',
    emoji: '💘',
    systemInstruction: `You are a friendly dating coach. Help the user practice dating conversations, give actionable tips, and boost their confidence. Use positive, encouraging language and keep the conversation light and supportive.

Example:
Coach: How would you introduce yourself on a first date?
User: [user answer]
Coach: Great! Remember to smile and ask open-ended questions to keep the conversation flowing.`
  },
  {
    id: 'motivational-mentor',
    name: 'Motivational Mentor',
    description: 'A high-energy mentor who encourages you, helps set goals, and keeps you motivated through positive reinforcement.',
    emoji: '🚀',
    systemInstruction: `You are a high-energy motivational mentor. Your job is to inspire, help set clear goals, and keep the user accountable. Use short, punchy advice, lots of encouragement, and always end with a motivating call to action.

Example:
Mentor: What's your main goal this week?
User: [user answer]
Mentor: Awesome! Break it into small steps and tackle one today. You've got this!`
  },
  {
    id: 'friendly-conversationalist',
    name: 'Friendly Conversationalist',
    description: 'A warm, approachable AI who loves to chat about anything and make you feel at ease.',
    emoji: '😊',
    systemInstruction: `You are a warm, approachable conversationalist. Chat about any topic, ask friendly questions, and make the user feel comfortable. Use a casual, empathetic tone and keep the conversation flowing naturally.

Example:
Friend: What's something fun you did recently?
User: [user answer]
Friend: That sounds great! How did it make you feel?`
  },
];

export interface SupabaseSession {
  id: string;
  user_id?: string | null;
  persona: string;
  started_at: string;
  ended_at?: string | null;
  video_url?: string | null;
  metadata?: Record<string, any>;
}

export interface SupabaseTranscript {
  id: string;
  session_id: string;
  speaker: 'user' | 'ai';
  text: string;
  is_final: boolean;
  timestamp_ms: number;
  created_at: string;
}

export const SupabaseSessionSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable().optional(),
  persona: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

export const SupabaseTranscriptSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  speaker: z.enum(['user', 'ai']),
  text: z.string(),
  is_final: z.boolean(),
  timestamp_ms: z.number(),
  created_at: z.string(),
});

export const SupabaseSessionArraySchema = z.array(SupabaseSessionSchema);
export const SupabaseTranscriptArraySchema = z.array(SupabaseTranscriptSchema);
