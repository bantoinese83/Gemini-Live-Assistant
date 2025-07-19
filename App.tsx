import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useGeminiLive from './hooks/useGeminiLive';
import ControlPanel from './components/ControlPanel';
import TranscriptDisplay from './components/TranscriptDisplay';
import VideoPreview from './components/VideoPreview';
import StatusDisplay from './components/StatusDisplay';
import VolumeControl from './components/VolumeControl';
import ApiKeyIndicator from './components/ApiKeyIndicator';
import LoadingSpinner from './components/LoadingSpinner';
import SystemInstructionInput from './components/SystemInstructionInput';
import AIBotVisualizer from './components/AIBotVisualizer';
import { AI_SPEAKING_RESET_DELAY_MS } from './constants';
import { TRANSITION_MEDIUM, BORDER_RADIUS_LG } from './theme';
import { AI_PERSONA_PRESETS } from './types';
import {
  createSession,
  addTranscript,
  uploadSessionVideo,
  deleteSessionAndData,
  uploadSessionAudio,
  getSession,
} from './services/sessionStorageService';
import { supabase } from './services/supabaseClient';
import type { SupabaseSession, SupabaseTranscript } from './types';

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { SupabaseSessionArraySchema, SupabaseTranscriptArraySchema } from './types';
import SessionHistoryDrawer from './components/SessionHistoryDrawer';
import SavePromptModal from './components/SavePromptModal';
import SessionPlaybackModal from './components/SessionPlaybackModal';
import SuccessOverlay from './components/SuccessOverlay';
import { analyzeSessionWithGemini } from './services/geminiLiveService';
import type { SessionAnalysisResult } from './types';
import AnalyticsDrawer from './components/AnalyticsDrawer';
import Toast from './components/common/ErrorBoundary';
import Header from './components/Header';
import Footer from './components/Footer';
import SessionTimer from './components/SessionTimer';
import SessionDownloader from './components/SessionDownloader';

/**
 * The main application component.
 * It orchestrates the UI, manages global state like system instructions and video enablement,
 * and integrates the `useGeminiLive` hook for AI interaction.
 */
const App: React.FC = () => {
  // Persona-aware system instruction
  const [systemInstruction, setSystemInstruction] = useState<string>(() => {
    const initialPersona = AI_PERSONA_PRESETS[0];
    return initialPersona.systemInstruction;
  });
  const [localIsVideoEnabled, setLocalIsVideoEnabled] = useState<boolean>(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Core AI interaction logic and state from the custom hook
  const {
    isInitialized,
    isRecording,
    statusMessage,
    errorMessage,
    inputGainNode,
    outputAudioContext,
    outputGainNode,
    apiKeyMissing,
    startRecording,
    stopRecording,
    resetSession,
    userTranscript,
    userTranscriptIsFinal,
    modelTranscript,
    modelTranscriptIsFinal,
    setVideoTrackEnabled,
    inputAudioContext,
    isScreenSharing,
    screenStream,
    startScreenSharing,
    stopScreenSharing,
  } = useGeminiLive(systemInstruction); // Pass current system instruction to the hook

  // State to track if the AI is currently speaking, used for the AIBotVisualizer
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // AI Persona selection state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(AI_PERSONA_PRESETS[0].id);
  // Track the last persona's default instruction for comparison
  const lastPersonaDefaultRef = React.useRef(systemInstruction);
  
  // Effect to sync initial persona with system instruction
  useEffect(() => {
    const currentPersona = AI_PERSONA_PRESETS.find(p => p.id === selectedPersonaId);
    if (currentPersona && systemInstruction !== currentPersona.systemInstruction) {
      setSystemInstruction(currentPersona.systemInstruction);
      lastPersonaDefaultRef.current = currentPersona.systemInstruction;
    }
  }, [selectedPersonaId, systemInstruction]);
  
  const handlePersonaChange = (personaId: string) => {
    const newPersona = AI_PERSONA_PRESETS.find(p => p.id === personaId);
    if (!newPersona) {
      console.error('Persona not found:', personaId);
      return;
    }
    
    console.log('Changing persona to:', newPersona.name, 'with instruction:', newPersona.systemInstruction.substring(0, 100) + '...');
    
    // Always update the system instruction when changing personas
    setSystemInstruction(newPersona.systemInstruction);
    lastPersonaDefaultRef.current = newPersona.systemInstruction;
    setSelectedPersonaId(personaId);
  };

  // Effect to manage AI speaking state for bot visualizer based on model transcript activity.
  useEffect(() => {
    let timerId: number | undefined;
    if (modelTranscript && !modelTranscriptIsFinal) {
      // AI is actively producing interim transcript parts.
      setIsAiSpeaking(true);
      if (timerId) {
        clearTimeout(timerId);
      } // Clear any pending timeout to turn off speaking
    } else if (modelTranscriptIsFinal && modelTranscript.length > 0) {
      // AI has finished a complete utterance. Keep "speaking" for a short delay for animation.
      setIsAiSpeaking(true);
      timerId = window.setTimeout(() => setIsAiSpeaking(false), AI_SPEAKING_RESET_DELAY_MS);
    } else { // No model transcript or it's empty and final (AI is silent).
      setIsAiSpeaking(false);
      if (timerId) {
        clearTimeout(timerId);
      }
    }
    return () => clearTimeout(timerId); // Cleanup timeout on unmount or dependency change.
  }, [modelTranscript, modelTranscriptIsFinal]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);

  const [savingMode, setSavingMode] = useState<'none' | 'creating' | 'saving'>(
    'none'
  );

  // Session timer state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Success overlay state
  const [showSuccess, setShowSuccess] = useState(false);
  // Local status override for forcing 'Ready' after save/discard
  const [statusOverride, setStatusOverride] = useState<string | null>(null);

  // Helper to get persona name
  const getPersonaName = () => {
    const persona = AI_PERSONA_PRESETS.find(p => p.id === selectedPersonaId);
    return persona ? persona.name : 'Unknown';
  };

  // Helper to get combined audio+video stream and video-only stream
  const getCombinedMediaStream = async (videoEnabled: boolean) => {
    const audioConstraints = {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    };
    
    console.log('Getting combined media stream, video enabled:', videoEnabled);
    
    if (videoEnabled) {
      // Get video and audio streams separately
      console.log('Requesting video stream...');
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('Video stream obtained, tracks:', videoStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      console.log('Requesting audio stream...');
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
      console.log('Audio stream obtained, tracks:', audioStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Combine tracks
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      
      console.log('Combined stream created with tracks:', combinedStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      return { combinedStream, videoStream };
    } else {
      // Audio only
      console.log('Requesting audio-only stream...');
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      console.log('Audio-only stream obtained, tracks:', audioStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      return { combinedStream: audioStream, videoStream: null };
    }
  };

  // 1. On start recording, create a session in Supabase and start MediaRecorder
  const handleStartRecording = useCallback(async () => {
    setStatusOverride(null);
    setSaveError(null);
    setSavingMode('creating');
    setIsSaving(true);
    setSessionStartTime(new Date()); // Set session start time
    try {
      const session = await createSession({
        persona: getPersonaName(),
        metadata: { systemInstruction, persona: getPersonaName() },
      });
      sessionIdRef.current = session.id;
      // Get combined and video-only streams based on video enabled state
      const { combinedStream, videoStream } = await getCombinedMediaStream(localIsVideoEnabled);
      combinedStreamRef.current = combinedStream;
      videoStreamRef.current = videoStream;
      // Show live preview (only if video is enabled)
      setLocalIsVideoEnabled(localIsVideoEnabled); // use current state
      setMediaStream(videoStream); // set for VideoPreview (null if audio only)
      // Start MediaRecorder with correct stream
      recordedChunksRef.current = [];
      let recorder;
      
      // Try to find a supported MIME type for video recording
      const supportedMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
        'video/ogg;codecs=theora,vorbis'
      ];
      
      let mimeType = null;
      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('Using MIME type for recording:', mimeType);
      
      try {
        if (mimeType) {
          recorder = new MediaRecorder(combinedStream, { mimeType });
        } else {
          recorder = new MediaRecorder(combinedStream);
        }
      } catch (e) {
        console.error('Failed to create MediaRecorder with MIME type:', e);
        // Fallback to default
        recorder = new MediaRecorder(combinedStream);
      }
      
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        console.log('MediaRecorder data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Start recording with timeslice to get regular chunks
      recorder.start(1000); // Get chunks every 1 second
      console.log('MediaRecorder started with timeslice');
      startRecording(localIsVideoEnabled); // use current state
    } catch (err: any) {
      setSaveError('Failed to start session: ' + (err.message || err.toString()));
    } finally {
      setIsSaving(false);
      setSavingMode('none');
    }
  }, [startRecording, systemInstruction, selectedPersonaId, localIsVideoEnabled]);

  // 2. On transcript update, save to Supabase
  useEffect(() => {
    if (!sessionIdRef.current || typeof sessionIdRef.current !== 'string') {
      return;
    }
    const saveTranscripts = async () => {
      try {
        if (userTranscript) {
          await addTranscript({
            session_id: sessionIdRef.current as string,
            speaker: 'user',
            text: userTranscript,
            is_final: userTranscriptIsFinal,
            timestamp_ms: Date.now(),
          });
        }
        if (modelTranscript) {
          await addTranscript({
            session_id: sessionIdRef.current as string,
            speaker: 'ai',
            text: modelTranscript,
            is_final: modelTranscriptIsFinal,
            timestamp_ms: Date.now(),
          });
        }
      } catch (err: any) {
        setSaveError('Failed to save transcript: ' + (err.message || err.toString()));
      }
    };
    saveTranscripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTranscript, userTranscriptIsFinal, modelTranscript, modelTranscriptIsFinal]);

  // 3. On stop recording, stop MediaRecorder, upload video, and update session
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [, setPendingStop] = useState(false);
  const handleStopRecording = useCallback(async () => {
    setPendingStop(true);
    setShowSavePrompt(true);
  }, []);
  const confirmSaveSession = useCallback(async (shouldSave: boolean) => {
    setShowSavePrompt(false);
    setPendingStop(false);
    if (!shouldSave) {
      // Discard: Clean up local state AND delete the session from database
      stopRecording();
      
      // Delete the session from database if it exists
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        try {
          console.log('Deleting unsaved session:', sessionId);
          // Get the session first to delete it properly
          const session = await getSession(sessionId);
          await deleteSessionAndData(session);
          console.log('Successfully deleted unsaved session');
        } catch (err: any) {
          console.error('Failed to delete unsaved session:', err);
          // Don't show error to user for cleanup failures
        }
      }
      
      sessionIdRef.current = null;
      videoBlobRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach(track => track.stop());
        combinedStreamRef.current = null;
      }
      setMediaStream(null);
      setSessionStartTime(null); // Reset session timer
      setStatusOverride('Ready');
      setTimeout(() => setStatusOverride(null), 2000);
      return;
    }
    setSaveError(null);
    setSavingMode('saving');
    setIsSaving(true);
    try {
      stopRecording();
      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;
        await new Promise<void>((resolve) => {
          recorder.onstop = () => {
            console.log('MediaRecorder stopped, creating blob from', recordedChunksRef.current.length, 'chunks');
            console.log('Chunk sizes:', recordedChunksRef.current.map(chunk => chunk.size));
            const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
            console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
            videoBlobRef.current = blob;
            resolve();
          };
          recorder.stop();
        });
      }
      const sessionId = sessionIdRef.current ?? '';
      if (sessionId && videoBlobRef.current instanceof Blob) {
        if (videoBlobRef.current.size === 0) {
          setSaveError('No media was recorded or the file is empty.');
        } else {
          try {
            if (localIsVideoEnabled) {
              const { path } = await uploadSessionVideo(sessionId, videoBlobRef.current);
              await supabase.from('sessions').update({ video_url: path, ended_at: new Date().toISOString() }).eq('id', sessionId);
            } else {
              const { path } = await uploadSessionAudio(sessionId, videoBlobRef.current);
              await supabase.from('sessions').update({ audio_url: path, ended_at: new Date().toISOString() }).eq('id', sessionId);
            }
          } catch (uploadErr: any) {
            setSaveError('Failed to upload media: ' + (uploadErr.message || uploadErr.toString()));
          }
        }
      }
      sessionIdRef.current = null;
      videoBlobRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach(track => track.stop());
        combinedStreamRef.current = null;
      }
      setMediaStream(null);
      setSessionStartTime(null); // Reset session timer
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setStatusOverride('Ready');
      setTimeout(() => setStatusOverride(null), 2000);
      fetchHistory();
      fetchDashboardData();
      setToast({ message: 'Session saved!', type: 'success' });
    } catch (err: any) {
      setSaveError('Failed to save media: ' + (err.message || err.toString()));
      setToast({ message: 'Failed to save session: ' + (err.message || err.toString()), type: 'error' });
    } finally {
      setIsSaving(false);
      setSavingMode('none');
    }
  }, [stopRecording, uploadSessionVideo, uploadSessionAudio, supabase, localIsVideoEnabled]);

  /** Handles the reset session action. */
  const handleResetSession = useCallback(async () => {
    setStatusOverride(null);
    
    // If there's an active session that hasn't been saved, delete it
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      try {
        console.log('Resetting session - deleting unsaved session:', sessionId);
        const session = await getSession(sessionId);
        await deleteSessionAndData(session);
        console.log('Successfully deleted unsaved session during reset');
      } catch (err: any) {
        console.error('Failed to delete unsaved session during reset:', err);
        // Don't show error to user for cleanup failures
      }
      sessionIdRef.current = null;
    }
    
    setSessionStartTime(null); // Reset session timer
    resetSession();
  }, [resetSession]);
  
  /** 
   * Handles toggling the video stream on/off.
   * Updates local state and calls the hook's function to toggle the media track.
   */
  const handleToggleVideo = useCallback((enable: boolean) => {
    setLocalIsVideoEnabled(enable);
    setVideoTrackEnabled?.(enable); // Call hook function if available
  }, [setVideoTrackEnabled]);

  const handleToggleScreenShare = useCallback(async (enable: boolean) => {
    if (enable) {
      await startScreenSharing();
    } else {
      stopScreenSharing();
    }
  }, [startScreenSharing, stopScreenSharing]);

  /**
   * Handles changes to the system instruction.
   * Updates local state. The `useGeminiLive` hook will re-initialize if `systemInstruction` changes.
   * Prevents changes if currently recording.
   */
  const handleSystemInstructionSet = useCallback((newInstruction: string) => {
    if (isRecording) {
      alert("Please stop recording before changing the system instruction. Changes will apply on the next session start or reset.");
      return;
    }
    setSystemInstruction(newInstruction);
    lastPersonaDefaultRef.current = newInstruction;
  }, [isRecording]);

  // Memoized initial loading UI
  const loadingScreen = useMemo(() => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)] p-4">
      <LoadingSpinner />
      <p className="mt-4 text-lg">{statusMessage || "Initializing application..."}</p>
    </div>
  ), [statusMessage]);

  const [showHistory, setShowHistory] = useState(false);
  const SESSIONS_PAGE_SIZE = 10;
  const [sessions, setSessions] = useState<SupabaseSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const lastSessionStartedAtRef = useRef<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SupabaseSession | null>(null);
  const [selectedTranscripts, setSelectedTranscripts] = useState<SupabaseTranscript[]>([]);
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackVideoUrl, setPlaybackVideoUrl] = useState<string | null>(null);
  const [playbackAudioUrl, setPlaybackAudioUrl] = useState<string | null>(null);
  const [downloadSession, setDownloadSession] = useState<SupabaseSession | null>(null);
  const [downloadTranscripts, setDownloadTranscripts] = useState<SupabaseTranscript[]>([]);
  const [downloadVideoUrl, setDownloadVideoUrl] = useState<string | null>(null);
  const [downloadAudioUrl, setDownloadAudioUrl] = useState<string | null>(null);

  // Set up axios-retry for all axios requests
  axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

  // Fetch a page of sessions
  const fetchSessionsPage = async (afterStartedAt?: string | null) => {
    setIsFetchingMore(true);
    try {
      let query = supabase.from('sessions').select('*').order('started_at', { ascending: false }).limit(SESSIONS_PAGE_SIZE);
      if (afterStartedAt) {
        query = query.lt('started_at', afterStartedAt);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const valid = SupabaseSessionArraySchema.parse(data || []);
      if (valid.length < SESSIONS_PAGE_SIZE) {
        setHasMoreSessions(false);
      }
      if (afterStartedAt) {
        setSessions(prev => [...prev, ...valid]);
      } else {
        setSessions(valid);
      }
      if (valid.length > 0) {
        lastSessionStartedAtRef.current = valid[valid.length - 1].started_at;
      }
    } catch (err: any) {
      setHistoryError('Failed to load session history: ' + (err.message || err.toString()));
      setHasMoreSessions(false);
    } finally {
      setIsFetchingMore(false);
      setHistoryLoading(false);
    }
  };

  // Initial fetch or refresh
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    setHasMoreSessions(true);
    lastSessionStartedAtRef.current = null;
    await fetchSessionsPage();
  };

  // Ref for the scrollable container in the session history drawer
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const scrollThrottleRef = useRef<number>(0);

  // Auto-fetch on scroll for session history
  useEffect(() => {
    if (!showHistory) {
      return;
    }
    const container = historyScrollRef.current;
    if (!container) {
      return;
    }
    const THROTTLE_MS = 200;
    const handleScroll = () => {
      const now = Date.now();
      if (now - scrollThrottleRef.current < THROTTLE_MS) return;
      scrollThrottleRef.current = now;
      if (
        container.scrollHeight - container.scrollTop - container.clientHeight < 120 &&
        hasMoreSessions &&
        !isFetchingMore &&
        !historyLoading
      ) {
        fetchSessionsPage(lastSessionStartedAtRef.current);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showHistory, hasMoreSessions, isFetchingMore, historyLoading]);

  // --- Session Analysis State ---
  const [sessionAnalysisMap, setSessionAnalysisMap] = useState<{ [sessionId: string]: SessionAnalysisResult }>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Handler for when a session is selected from history
  const handleSessionClick = async (session: SupabaseSession) => {
    console.log('Session clicked:', session);
    setSelectedSession(session);
    if (session.video_url) {
      try {
        console.log('Generating signed URL for video:', session.video_url);
        const { data, error } = await supabase.storage
          .from('session-videos')
          .createSignedUrl(session.video_url, 60 * 60);
        if (!error && data?.signedUrl) {
          console.log('Video signed URL generated:', data.signedUrl);
          setPlaybackVideoUrl(data.signedUrl);
        } else {
          console.error('Failed to generate video signed URL:', error);
          setPlaybackVideoUrl(null);
        }
      } catch (err) {
        console.error('Error generating video signed URL:', err);
        setPlaybackVideoUrl(null);
      }
    } else {
      console.log('No video URL for session');
      setPlaybackVideoUrl(null);
    }
    if (session.audio_url) {
      try {
        console.log('Generating signed URL for audio:', session.audio_url);
        const { data, error } = await supabase.storage
          .from('session_audio')
          .createSignedUrl(session.audio_url, 60 * 60);
        if (!error && data?.signedUrl) {
          console.log('Audio signed URL generated:', data.signedUrl);
          setPlaybackAudioUrl(data.signedUrl);
        } else {
          console.error('Failed to generate audio signed URL:', error);
          setPlaybackAudioUrl(null);
        }
      } catch (err) {
        console.error('Error generating audio signed URL:', err);
        setPlaybackAudioUrl(null);
      }
    } else {
      console.log('No audio URL for session');
      setPlaybackAudioUrl(null);
    }
    setShowPlayback(true);
    setAnalysisLoading(true);
    // Fetch transcripts for the session
    let transcripts: SupabaseTranscript[] = [];
    try {
      console.log('Fetching transcripts for session:', session.id);
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp_ms', { ascending: true });
      if (error) throw error;
      transcripts = SupabaseTranscriptArraySchema.parse(data || []);
      console.log('Transcripts fetched:', transcripts.length, 'entries');
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      transcripts = [];
    }
    setSelectedTranscripts(transcripts);
    if (sessionAnalysisMap[session.id]) {
      console.log('Using cached analysis for session:', session.id);
      setAnalysisLoading(false);
      return;
    }
    const analysisFromDb = session.metadata?.analysis;
    if (analysisFromDb) {
      console.log('Using analysis from database for session:', session.id);
      setSessionAnalysisMap(prev => ({ ...prev, [session.id]: analysisFromDb }));
      setAnalysisLoading(false);
      return;
    }
    
    // Check if we have transcripts to analyze
    if (transcripts.length === 0) {
      console.warn('No transcripts found for session:', session.id);
      setToast({ 
        message: 'No transcripts found for this session. Analysis requires conversation data.', 
        type: 'error' 
      });
      setAnalysisLoading(false);
      return;
    }
    
    console.log('Transcript content preview:', transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n').substring(0, 300) + '...');
    
    try {
      // Generate signed URLs for analysis
      let analysisVideoUrl: string | undefined = undefined;
      let analysisAudioUrl: string | undefined = undefined;
      
      if (session.video_url) {
        try {
          console.log('Generating signed URL for video analysis:', session.video_url);
          const { data, error } = await supabase.storage
            .from('session-videos')
            .createSignedUrl(session.video_url, 60 * 60);
          if (!error && data?.signedUrl) {
            console.log('Video signed URL for analysis generated:', data.signedUrl);
            analysisVideoUrl = data.signedUrl;
          } else {
            console.error('Failed to generate video signed URL for analysis:', error);
          }
        } catch (err) {
          console.error('Error generating video signed URL for analysis:', err);
        }
      }
      
      if (session.audio_url) {
        try {
          console.log('Generating signed URL for audio analysis:', session.audio_url);
          const { data, error } = await supabase.storage
            .from('session_audio')
            .createSignedUrl(session.audio_url, 60 * 60);
          if (!error && data?.signedUrl) {
            console.log('Audio signed URL for analysis generated:', data.signedUrl);
            analysisAudioUrl = data.signedUrl;
          } else {
            console.error('Failed to generate audio signed URL for analysis:', error);
          }
        } catch (err) {
          console.error('Error generating audio signed URL for analysis:', err);
        }
      }
      
      const persona = session.persona;
      const systemInstruction = session.metadata?.systemInstruction;
      console.log('Starting session analysis for session:', session.id, {
        analysisVideoUrl,
        analysisAudioUrl,
        persona,
        transcriptCount: transcripts.length,
        hasSystemInstruction: !!systemInstruction
      });
      const analysis = await analyzeSessionWithGemini({
        videoUrl: analysisVideoUrl,
        audioUrl: analysisAudioUrl,
        transcripts,
        sessionId: session.id,
        persona,
        systemInstruction,
        started_at: session.started_at,
        ended_at: session.ended_at || undefined,
      });
      console.log('Session analysis completed successfully:', analysis);
      setSessionAnalysisMap(prev => ({ ...prev, [session.id]: analysis }));
      setAnalysisLoading(false);
    } catch (e) {
      console.error('Session analysis failed:', e);
      // Show error to user via toast
      setToast({ 
        message: 'Failed to analyze session: ' + (e instanceof Error ? e.message : 'Unknown error'), 
        type: 'error' 
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Handler to force re-analysis of a session
  const handleReanalyze = async () => {
    if (!selectedSession) return;
    setAnalysisLoading(true);
    try {
      // Generate signed URLs for analysis
      let analysisVideoUrl: string | undefined = undefined;
      let analysisAudioUrl: string | undefined = undefined;
      
      if (selectedSession.video_url) {
        try {
          console.log('Generating signed URL for video re-analysis:', selectedSession.video_url);
          const { data, error } = await supabase.storage
            .from('session-videos')
            .createSignedUrl(selectedSession.video_url, 60 * 60);
          if (!error && data?.signedUrl) {
            console.log('Video signed URL for re-analysis generated:', data.signedUrl);
            analysisVideoUrl = data.signedUrl;
          } else {
            console.error('Failed to generate video signed URL for re-analysis:', error);
          }
        } catch (err) {
          console.error('Error generating video signed URL for re-analysis:', err);
        }
      }
      
      if (selectedSession.audio_url) {
        try {
          console.log('Generating signed URL for audio re-analysis:', selectedSession.audio_url);
          const { data, error } = await supabase.storage
            .from('session_audio')
            .createSignedUrl(selectedSession.audio_url, 60 * 60);
          if (!error && data?.signedUrl) {
            console.log('Audio signed URL for re-analysis generated:', data.signedUrl);
            analysisAudioUrl = data.signedUrl;
          } else {
            console.error('Failed to generate audio signed URL for re-analysis:', error);
          }
        } catch (err) {
          console.error('Error generating audio signed URL for re-analysis:', err);
        }
      }
      
      const persona = selectedSession.persona;
      const systemInstruction = selectedSession.metadata?.systemInstruction;
      console.log('Starting re-analysis for session:', selectedSession.id, {
        analysisVideoUrl,
        analysisAudioUrl,
        persona,
        transcriptCount: selectedTranscripts.length,
        hasSystemInstruction: !!systemInstruction
      });
      const analysis = await analyzeSessionWithGemini({
        videoUrl: analysisVideoUrl,
        audioUrl: analysisAudioUrl,
        transcripts: selectedTranscripts,
        sessionId: selectedSession.id,
        persona,
        systemInstruction,
        started_at: selectedSession.started_at,
        ended_at: selectedSession.ended_at || undefined,
      });
      console.log('Re-analysis completed successfully:', analysis);
      setSessionAnalysisMap(prev => ({ ...prev, [selectedSession.id]: analysis }));
    } catch (e) {
      console.error('Re-analysis failed:', e);
      // Show error to user via toast
      setToast({ 
        message: 'Failed to re-analyze session: ' + (e instanceof Error ? e.message : 'Unknown error'), 
        type: 'error' 
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Handler for downloading sessions
  const handleDownloadSession = async (session: SupabaseSession) => {
    try {
      // Fetch transcripts for the session
      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp_ms', { ascending: true });
      
      if (error) throw error;
      setDownloadTranscripts(transcripts || []);

      // Get signed URLs for media files
      let videoUrl: string | null = null;
      let audioUrl: string | null = null;

      if (session.video_url) {
        try {
          const { data, error } = await supabase.storage
            .from('session-videos')
            .createSignedUrl(session.video_url, 60 * 60);
          if (!error && data?.signedUrl) {
            videoUrl = data.signedUrl;
          }
        } catch (error) {
          console.warn('Failed to get video URL:', error);
        }
      }

      if (session.audio_url) {
        try {
          const { data, error } = await supabase.storage
            .from('session_audio')
            .createSignedUrl(session.audio_url, 60 * 60);
          if (!error && data?.signedUrl) {
            audioUrl = data.signedUrl;
          }
        } catch (error) {
          console.warn('Failed to get audio URL:', error);
        }
      }

      setDownloadVideoUrl(videoUrl);
      setDownloadAudioUrl(audioUrl);
      setDownloadSession(session);
    } catch (error) {
      console.error('Failed to prepare session for download:', error);
      setToast({
        message: 'Failed to prepare session for download',
        type: 'error'
      });
    }
  };

  // --- Session History Drawer ---
  const [videoThumbnails, setVideoThumbnails] = useState<{ [sessionId: string]: string }>({});
  const [thumbnailLoading, setThumbnailLoading] = useState<{ [sessionId: string]: boolean }>({});

  // Fetch signed URLs for video thumbnails after sessions are loaded
  useEffect(() => {
    const fetchThumbnails = async () => {
      const newThumbnails: { [sessionId: string]: string } = {};
      const newLoading: { [sessionId: string]: boolean } = {};
      await Promise.all(sessions.map(async (session) => {
        if (session.video_url && !videoThumbnails[session.id]) {
          newLoading[session.id] = true;
          try {
            const { data, error } = await supabase.storage
              .from('session-videos')
              .createSignedUrl(session.video_url, 60 * 60);
            if (!error && data?.signedUrl) {
              newThumbnails[session.id] = data.signedUrl;
            }
          } catch {}
          newLoading[session.id] = false;
        }
      }));
      if (Object.keys(newThumbnails).length > 0) {
        setVideoThumbnails(prev => ({ ...prev, ...newThumbnails }));
      }
      if (Object.keys(newLoading).length > 0) {
        setThumbnailLoading(prev => ({ ...prev, ...newLoading }));
      }
    };
    if (sessions.length > 0) {
      fetchThumbnails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // Update handleDeleteSession to delete immediately
  const [toast, setToast] = useState<{ message: string, actionLabel?: string, onAction?: () => void, type?: 'success' | 'error' | 'info' } | null>(null);

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    try {
      await deleteSessionAndData(session);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setToast({ message: 'Session deleted!', type: 'success' });
    } catch (err: any) {
      setToast({ message: 'Failed to delete session: ' + (err.message || err.toString()), type: 'error' });
      throw err;
    }
  };

  // Auto-dismiss toast after 4s unless undo is available
  useEffect(() => {
    if (toast && !toast.actionLabel) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Cleanup unsaved sessions on component unmount
  useEffect(() => {
    return () => {
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        console.log('Component unmounting - cleaning up unsaved session:', sessionId);
        // Use a fire-and-forget approach for cleanup on unmount
        getSession(sessionId)
          .then(session => deleteSessionAndData(session))
          .then(() => console.log('Successfully cleaned up unsaved session on unmount'))
          .catch(err => console.error('Failed to cleanup unsaved session on unmount:', err));
      }
    };
  }, []);

  // --- Analytics Dashboard State ---
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardSessions, setDashboardSessions] = useState<any[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Fetch all sessions with analysis from Supabase
  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, persona, started_at, ended_at, metadata')
        .not('metadata', 'is', null);
      if (error) throw error;
      setDashboardSessions(data || []);
    } catch (err: any) {
      setDashboardError('Failed to load analytics: ' + (err.message || err.toString()));
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (showDashboard) {
      fetchDashboardData();
    }
  }, [showDashboard]);

  // Aggregate analytics
  const analytics = useMemo(() => {
    if (!dashboardSessions.length) return null;
    let totalSessions = dashboardSessions.length;
    let totalDuration = 0;
    let sentimentCounts: Record<string, number> = {};
    let allInsights: string[] = [];
    dashboardSessions.forEach(s => {
      const analysis = s.metadata?.analysis;
      if (analysis) {
        totalDuration += analysis.keyMetrics?.duration || 0;
        const sentiment = analysis.keyMetrics?.sentiment || 'unknown';
        sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
        if (Array.isArray(analysis.insights)) {
          allInsights.push(...analysis.insights);
        }
      }
    });
    const avgDuration = totalSessions ? (totalDuration / totalSessions) : 0;
    const mostCommonSentiment = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const insightCounts: Record<string, number> = {};
    allInsights.forEach(i => { insightCounts[i] = (insightCounts[i] || 0) + 1; });
    const topInsights = Object.entries(insightCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      totalSessions,
      avgDuration,
      mostCommonSentiment,
      topInsights,
    };
  }, [dashboardSessions]);

  // Ensure session history is refreshed when drawer is opened or after save
  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  // Ensure analytics dashboard is refreshed when opened or after save
  useEffect(() => {
    if (showDashboard) {
      fetchDashboardData();
    }
  }, [showDashboard]);

  if (!isInitialized && !apiKeyMissing) {
    return loadingScreen;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)] overflow-hidden fade-in">
      <Header 
        onShowHistory={() => setShowHistory(true)}
        onToggleDashboard={() => setShowDashboard(d => !d)}
        showDashboard={showDashboard}
        isScreenSharing={isScreenSharing}
        screenStream={screenStream}
      />
      <main className="flex flex-1 min-h-0 overflow-auto">
        <div className="flex flex-1 flex-col lg:flex-row w-full">
          {/* Success Overlay */}
          <SuccessOverlay visible={showSuccess} />
          {/* Error Banner */}
          {errorMessage && (
            <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white text-center py-2 shadow-lg animate-pulse">
              <span className="font-semibold">Error:</span> {errorMessage}
            </div>
          )}
          {/* Session History Drawer */}
          <SessionHistoryDrawer
            open={showHistory}
            sessions={sessions}
            loading={historyLoading}
            error={historyError}
            videoThumbnails={videoThumbnails}
            thumbnailLoading={thumbnailLoading}
            onSessionClick={handleSessionClick}
            onDeleteSession={handleDeleteSession}
            onDownloadSession={handleDownloadSession}
            onClose={() => setShowHistory(false)}
            hasMoreSessions={hasMoreSessions}
            isFetchingMore={isFetchingMore}
            scrollContainerRef={historyScrollRef}
          />
          <AnalyticsDrawer
            open={showDashboard}
            loading={dashboardLoading}
            error={dashboardError}
            analytics={analytics}
            onClose={() => setShowDashboard(false)}
          />
          {/* Sidebar / Control Area */}
          <aside className={`w-full lg:w-80 xl:w-96 bg-[var(--color-background-secondary)] p-3 sm:p-4 shadow-lg flex-shrink-0 lg:h-full lg:overflow-y-auto space-y-4 ${TRANSITION_MEDIUM} border-r border-[var(--color-border-primary)]`}>
            <ApiKeyIndicator apiKeyMissing={apiKeyMissing} />

            {!apiKeyMissing && (
              <>
                <SystemInstructionInput
                  currentInstruction={systemInstruction}
                  onInstructionSet={handleSystemInstructionSet}
                  disabled={isRecording}
                />
                <ControlPanel
                  isRecording={isRecording}
                  isInitialized={isInitialized}
                  apiKeyMissing={apiKeyMissing}
                  isVideoEnabled={localIsVideoEnabled}
                  isScreenSharing={isScreenSharing}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  onResetSession={handleResetSession}
                  onToggleVideo={handleToggleVideo}
                  onToggleScreenShare={handleToggleScreenShare}
                  selectedPersonaId={selectedPersonaId}
                  onPersonaChange={handlePersonaChange}
                />
                <div className="space-y-3 pt-2 border-t border-[var(--color-border-primary)] mt-3">
                  <VolumeControl label="Input (Mic)" gainNode={inputGainNode} initialVolume={1.0} audioContext={inputAudioContext} />
                  <VolumeControl label="Output (AI Voice)" gainNode={outputGainNode} initialVolume={0.7} audioContext={outputAudioContext} />
                </div>
                
                {/* Session Timer and Disk Space */}
                <div className="pt-2 border-t border-[var(--color-border-primary)] mt-3">
                  <SessionTimer 
                    isRecording={isRecording}
                    sessionStartTime={sessionStartTime}
                  />
                </div>
                
                 <div className="pt-2 mt-auto"> {/* Push StatusDisplay to bottom of sidebar */}
                    <StatusDisplay
                      statusMessage={statusOverride || ((!isRecording && (!statusMessage || statusMessage.toLowerCase().includes('ready') || statusMessage === 'Initializing...')) ? 'Ready' : statusMessage)}
                      errorMessage={errorMessage}
                      isSaving={isSaving}
                      statusType={
                        errorMessage ? 'error' :
                        isSaving ? 'processing' :
                        isRecording ? 'recording' :
                        (statusMessage?.toLowerCase().includes('connecting') || statusMessage?.toLowerCase().includes('initializing')) ? 'connecting' :
                        'idle'
                      }
                      onTimeout={() => {
                        setStatusOverride('Ready');
                        setIsSaving(false);
                      }}
                    />
                </div>
              </>
            )}
          </aside>

          {/* Main Content Area */}
          <section className={`flex-grow p-3 sm:p-4 lg:p-6 flex flex-col space-y-4 overflow-y-auto lg:overflow-hidden h-full pb-4 ${TRANSITION_MEDIUM}`}>
            {/* Video and AI Bot Visualizer Area */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 md:h-[40%] md:max-h-[300px] lg:h-[45%] lg:max-h-[350px] xl:max-h-[400px] ${TRANSITION_MEDIUM}`}>
              <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-video md:aspect-auto hover-lift`}>
                <VideoPreview mediaStream={mediaStream} isVideoEnabled={localIsVideoEnabled} />
              </div>
              <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-square md:aspect-auto hover-lift`}>
                <AIBotVisualizer 
                  audioContext={outputAudioContext} 
                  sourceNode={outputGainNode}
                  isAssistantSpeaking={isAiSpeaking} 
                />
              </div>
            </div>
            {/* Transcript Display Area */}
            <div className={`flex-grow min-h-0 md:h-[60%] lg:h-[55%] ${TRANSITION_MEDIUM}`}> 
              <TranscriptDisplay
                userTranscript={userTranscript}
                userTranscriptIsFinal={userTranscriptIsFinal}
                modelTranscript={modelTranscript}
                modelTranscriptIsFinal={modelTranscriptIsFinal}
              />
            </div>
          </section>
          {/* Save Prompt Modal */}
          <SavePromptModal
            open={showSavePrompt}
            isSaving={isSaving}
            savingMode={savingMode}
            saveError={saveError}
            onConfirm={confirmSaveSession}
            onClose={() => setShowSavePrompt(false)}
          />
          {/* Session Playback Modal */}
          <SessionPlaybackModal
            open={showPlayback}
            session={selectedSession}
            transcripts={selectedTranscripts}
            videoUrl={playbackVideoUrl}
            audioUrl={playbackAudioUrl}
            onClose={() => setShowPlayback(false)}
            sessionAnalysis={selectedSession ? sessionAnalysisMap[selectedSession.id] : undefined}
            analysisLoading={analysisLoading}
            onReanalyze={handleReanalyze}
          />
          {/* Session Download Modal */}
          {downloadSession && (
            <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center">
              <div
                className="bg-[var(--color-background-primary)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
                onClick={e => e.stopPropagation()}
              >
                <SessionDownloader
                  session={downloadSession}
                  transcripts={downloadTranscripts}
                  videoUrl={downloadVideoUrl}
                  audioUrl={downloadAudioUrl}
                  sessionAnalysis={downloadSession ? sessionAnalysisMap[downloadSession.id] : undefined}
                  onClose={() => {
                    setDownloadSession(null);
                    setDownloadTranscripts([]);
                    setDownloadVideoUrl(null);
                    setDownloadAudioUrl(null);
                  }}
                />
              </div>
            </div>
          )}
          {toast && (
            <Toast
              message={toast.message}
              actionLabel={toast.actionLabel}
              onAction={toast.onAction}
              onClose={() => setToast(null)}
              type={toast.type}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;