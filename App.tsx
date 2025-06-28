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
  getCachedTranscripts,
  cacheTranscripts,
  deleteSessionAndData,
  uploadSessionAudio,
} from './services/sessionStorageService';
import { supabase } from './services/supabaseClient';
import type { SupabaseSession, SupabaseTranscript } from './types';
import { History, BarChart2 } from 'lucide-react';
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
  } = useGeminiLive(systemInstruction); // Pass current system instruction to the hook

  // State to track if the AI is currently speaking, used for the AIBotVisualizer
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // AI Persona selection state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(AI_PERSONA_PRESETS[0].id);
  // Track the last persona's default instruction for comparison
  const lastPersonaDefaultRef = React.useRef(systemInstruction);
  const handlePersonaChange = (personaId: string) => {
    const newPersona = AI_PERSONA_PRESETS.find(p => p.id === personaId);
    if (!newPersona) {
      return;
    }
    // If the current instruction matches the last persona's default, update to new persona's default
    const prevPersona = AI_PERSONA_PRESETS.find(p => p.id === selectedPersonaId);
    const prevDefault = prevPersona ? prevPersona.systemInstruction : '';
    if (systemInstruction.trim() === prevDefault.trim()) {
      setSystemInstruction(newPersona.systemInstruction);
      lastPersonaDefaultRef.current = newPersona.systemInstruction;
    }
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
    if (videoEnabled) {
      // Get video and audio streams separately
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      // Combine tracks
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      return { combinedStream, videoStream };
    } else {
      // Audio only
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return { combinedStream: audioStream, videoStream: null };
    }
  };

  // 1. On start recording, create a session in Supabase and start MediaRecorder
  const handleStartRecording = useCallback(async () => {
    setStatusOverride(null);
    setSaveError(null);
    setSavingMode('creating');
    setIsSaving(true);
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
      try {
        recorder = new MediaRecorder(combinedStream);
      } catch (e) {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      }
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.start();
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
      // Discard: Clean up local state only
      stopRecording();
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
            const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setStatusOverride('Ready');
      setTimeout(() => setStatusOverride(null), 2000);
      fetchHistory();
      fetchDashboardData();
    } catch (err: any) {
      setSaveError('Failed to save media: ' + (err.message || err.toString()));
    } finally {
      setIsSaving(false);
      setSavingMode('none');
    }
  }, [stopRecording, uploadSessionVideo, uploadSessionAudio, supabase, localIsVideoEnabled]);

  /** Handles the reset session action. */
  const handleResetSession = useCallback(() => {
    setStatusOverride(null);
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
    setSelectedSession(session);
    setPlaybackVideoUrl(session.video_url || null);
    if (session.audio_url) {
      try {
        const { data, error } = await supabase.storage
          .from('session_audio')
          .createSignedUrl(session.audio_url, 60 * 60);
        if (!error && data?.signedUrl) {
          setPlaybackAudioUrl(data.signedUrl);
        } else {
          setPlaybackAudioUrl(null);
        }
      } catch {
        setPlaybackAudioUrl(null);
      }
    } else {
      setPlaybackAudioUrl(null);
    }
    setShowPlayback(true);
    setAnalysisLoading(true);
    // Fetch transcripts for the session
    let transcripts: SupabaseTranscript[] = [];
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp_ms', { ascending: true });
      if (error) throw error;
      transcripts = SupabaseTranscriptArraySchema.parse(data || []);
    } catch {
      transcripts = [];
    }
    setSelectedTranscripts(transcripts);
    if (sessionAnalysisMap[session.id]) {
      setAnalysisLoading(false);
      return;
    }
    const analysisFromDb = session.metadata?.analysis;
    if (analysisFromDb) {
      setSessionAnalysisMap(prev => ({ ...prev, [session.id]: analysisFromDb }));
      setAnalysisLoading(false);
      return;
    }
    try {
      const videoUrl = session.video_url || undefined;
      const audioUrl = session.audio_url || undefined;
      const persona = session.persona;
      const systemInstruction = session.metadata?.systemInstruction;
      const analysis = await analyzeSessionWithGemini({
        videoUrl,
        audioUrl,
        transcripts,
        sessionId: session.id,
        persona,
        systemInstruction,
        started_at: session.started_at,
        ended_at: session.ended_at,
      });
      setSessionAnalysisMap(prev => ({ ...prev, [session.id]: analysis }));
    } catch (e) {
      // Optionally handle error
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Handler to force re-analysis of a session
  const handleReanalyze = async () => {
    if (!selectedSession) return;
    setAnalysisLoading(true);
    try {
      const videoUrl = selectedSession.video_url || undefined;
      const audioUrl = selectedSession.audio_url || undefined;
      const persona = selectedSession.persona;
      const systemInstruction = selectedSession.metadata?.systemInstruction;
      const analysis = await analyzeSessionWithGemini({
        videoUrl,
        audioUrl,
        transcripts: selectedTranscripts,
        sessionId: selectedSession.id,
        persona,
        systemInstruction,
        started_at: selectedSession.started_at,
        ended_at: selectedSession.ended_at,
      });
      setSessionAnalysisMap(prev => ({ ...prev, [selectedSession.id]: analysis }));
    } catch (e) {
      // Optionally show error to user
    } finally {
      setAnalysisLoading(false);
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
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ session: SupabaseSession, index: number } | null>(null);

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const index = sessions.findIndex(s => s.id === sessionId);
    try {
      await deleteSessionAndData(session);
      setRecentlyDeleted({ session, index });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setToast({
        message: 'Session deleted',
        actionLabel: 'Undo',
        onAction: () => {
          setSessions(prev => {
            const arr = [...prev];
            arr.splice(index, 0, session);
            return arr;
          });
          setToast({ message: 'Session restored', type: 'success', onAction: undefined });
          setRecentlyDeleted(null);
        },
        type: 'info',
      });
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
    <div className="flex flex-col lg:flex-row h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)] overflow-hidden fade-in">
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
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-teal)] to-[var(--color-accent-sky)] pt-1 pb-2 mb-1 sm:mb-2">
            Gemini Live
          </h1>
          <div className="flex items-center gap-2 mb-4">
            <button
              className="p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-500/70"
              onClick={() => setShowHistory(true)}
              aria-label="Show History"
              title="Show History"
            >
              <History size={22} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-500/70"
              onClick={() => setShowDashboard(d => !d)}
              aria-label={showDashboard ? 'Hide Analytics' : 'Show Analytics'}
              title={showDashboard ? 'Hide Analytics' : 'Show Analytics'}
            >
              <BarChart2 size={22} />
            </button>
          </div>
        </div>
        
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
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onResetSession={handleResetSession}
              onToggleVideo={handleToggleVideo}
              selectedPersonaId={selectedPersonaId}
              onPersonaChange={handlePersonaChange}
            />
            <div className="space-y-3 pt-2 border-t border-[var(--color-border-primary)] mt-3">
              <VolumeControl label="Input (Mic)" gainNode={inputGainNode} initialVolume={1.0} audioContext={inputAudioContext} />
              <VolumeControl label="Output (AI Voice)" gainNode={outputGainNode} initialVolume={0.7} audioContext={outputAudioContext} />
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
      <main className={`flex-grow p-3 sm:p-4 lg:p-6 flex flex-col space-y-4 overflow-y-auto lg:overflow-hidden h-full ${TRANSITION_MEDIUM}`}>
        {/* Video and AI Bot Visualizer Area */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 md:h-[40%] md:max-h-[300px] lg:h-[45%] lg:max-h-[350px] xl:max-h-[400px] ${TRANSITION_MEDIUM}`}>
          <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-video md:aspect-auto`}>
            <VideoPreview mediaStream={mediaStream} isVideoEnabled={localIsVideoEnabled} />
          </div>
          <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-square md:aspect-auto`}>
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
      </main>
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
  );
};

export default App;