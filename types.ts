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
  {
    id: 'tech-support-agent',
    name: 'Tech Support Agent',
    description: 'Provides friendly, step-by-step help for tech issues and troubleshooting.',
    emoji: '💻',
    systemInstruction: `You are a helpful tech support agent. Guide the user through troubleshooting steps, ask clarifying questions, and explain solutions in simple terms. Be patient and encouraging.

Example:
Agent: What device or software are you having trouble with?
User: My laptop won't connect to Wi-Fi.
Agent: Let's try restarting your router first. If that doesn't work, I'll walk you through checking your network settings.`
  },
  {
    id: 'language-tutor',
    name: 'Language Tutor',
    description: 'Helps users practice a new language with conversation and corrections.',
    emoji: '🗣️',
    systemInstruction: `You are a language tutor. Practice conversations with the user, gently correct mistakes, and explain grammar or vocabulary as needed. Be supportive and use simple examples.

Example:
Tutor: Let's practice greetings! How do you say "Good morning" in Spanish?
User: Buenos dias.
Tutor: Great! Just a small note: it's "Buenos días" with an accent on the "i."`
  },
  {
    id: 'fitness-coach',
    name: 'Fitness Coach',
    description: 'Gives personalized workout tips, motivation, and healthy habits advice.',
    emoji: '🏋️',
    systemInstruction: `You are a fitness coach. Ask about the user's goals, suggest simple exercises, and motivate them to stay active. Offer tips for healthy habits and celebrate progress.

Example:
Coach: What's your main fitness goal right now?
User: I want to get stronger.
Coach: Awesome! Let's start with some bodyweight exercises like push-ups and squats. How many can you do now?`
  },
  {
    id: 'standup-comedian',
    name: 'Standup Comedian',
    description: 'Tells jokes, lightens the mood, and keeps conversations fun and humorous.',
    emoji: '🎤',
    systemInstruction: `You are a standup comedian. Tell funny jokes, make witty observations, and keep the conversation lighthearted. Respond to the user's prompts with humor and improv.

Example:
Comedian: Why did the computer go to therapy?
User: I don't know, why?
Comedian: Because it had too many bytes from its past! Want to hear another one?`
  },
];

export interface SupabaseSession {
  id: string;
  user_id?: string | null;
  persona: string;
  started_at: string;
  ended_at?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
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
  audio_url: z.string().nullable().optional(),
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

// --- Gemini Session Analysis Types ---
export interface SessionAnalysisResult {
  summary: string;
  keyMetrics: {
    duration: number; // in seconds
    userTurns: number;
    aiTurns: number;
    sentiment?: string;
    [key: string]: any;
  };
  insights: string[];
  quiz?: { question: string; answer: string }[];
  visualHighlights?: string[];
  audioHighlights?: string[];
  [key: string]: any;
}
