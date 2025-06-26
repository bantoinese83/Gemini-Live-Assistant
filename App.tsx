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
import { DEFAULT_SYSTEM_INSTRUCTION, AI_SPEAKING_RESET_DELAY_MS } from './constants';
import { TRANSITION_MEDIUM, BORDER_RADIUS_LG } from './theme';
import { AI_PERSONA_PRESETS } from './types';
import {
  createSession,
  addTranscript,
  uploadSessionVideo,
  getSession,
  getTranscripts,
} from './services/sessionStorageService';
import { supabase } from './services/supabaseClient';
import type { SupabaseSession, SupabaseTranscript } from './types';

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
    if (!newPersona) return;
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
      if (timerId) clearTimeout(timerId); // Clear any pending timeout to turn off speaking
    } else if (modelTranscriptIsFinal && modelTranscript.length > 0) {
      // AI has finished a complete utterance. Keep "speaking" for a short delay for animation.
      setIsAiSpeaking(true);
      timerId = window.setTimeout(() => setIsAiSpeaking(false), AI_SPEAKING_RESET_DELAY_MS);
    } else { // No model transcript or it's empty and final (AI is silent).
      setIsAiSpeaking(false);
      if (timerId) clearTimeout(timerId);
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

  // Helper to get persona name
  const getPersonaName = () => {
    const persona = AI_PERSONA_PRESETS.find(p => p.id === selectedPersonaId);
    return persona ? persona.name : 'Unknown';
  };

  // Helper to get combined audio+video stream and video-only stream
  const getCombinedMediaStream = async () => {
    // Get video and audio streams separately
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    // Combine tracks
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);
    return { combinedStream, videoStream };
  };

  // 1. On start recording, create a session in Supabase and start MediaRecorder
  const handleStartRecording = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const session = await createSession({
        persona: getPersonaName(),
        metadata: { systemInstruction },
      });
      sessionIdRef.current = session.id;
      // Get combined and video-only streams
      const { combinedStream, videoStream } = await getCombinedMediaStream();
      combinedStreamRef.current = combinedStream;
      videoStreamRef.current = videoStream;
      // Show live preview
      setLocalIsVideoEnabled(true); // ensure preview is enabled
      setMediaStream(videoStream); // set for VideoPreview
      // Start MediaRecorder with combined stream
      recordedChunksRef.current = [];
      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream);
      } catch (e) {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      }
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.start();
      startRecording(true); // always enable video for session
    } catch (err: any) {
      setSaveError('Failed to start session: ' + (err.message || err.toString()));
    } finally {
      setIsSaving(false);
    }
  }, [startRecording, systemInstruction, selectedPersonaId]);

  // 2. On transcript update, save to Supabase
  useEffect(() => {
    if (!sessionIdRef.current || typeof sessionIdRef.current !== 'string') return;
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
  const handleStopRecording = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      stopRecording();
      // Stop MediaRecorder and get the video blob
      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;
        await new Promise<void>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
            videoBlobRef.current = blob;
            // Log recorded chunks
            console.log('Recorded video chunks:', recordedChunksRef.current.length, 'Blob size:', blob.size);
            resolve();
          };
          recorder.stop();
        });
      }
      // Upload video if available
      const sessionId = sessionIdRef.current ?? '';
      if (sessionId && videoBlobRef.current instanceof Blob) {
        if (videoBlobRef.current.size === 0) {
          setSaveError('No video was recorded or the video file is empty.');
        } else {
          try {
            const { path } = await uploadSessionVideo(sessionId, videoBlobRef.current);
            // Update session with video_url as the file path
            await supabase.from('sessions').update({ video_url: path, ended_at: new Date().toISOString() }).eq('id', sessionId);
          } catch (uploadErr: any) {
            setSaveError('Failed to upload video: ' + (uploadErr.message || uploadErr.toString()));
          }
        }
      }
      sessionIdRef.current = null;
      videoBlobRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      // Stop and clean up streams
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach(track => track.stop());
        combinedStreamRef.current = null;
      }
      setMediaStream(null);
    } catch (err: any) {
      setSaveError('Failed to save video: ' + (err.message || err.toString()));
    } finally {
      setIsSaving(false);
    }
  }, [stopRecording]);

  /** Handles the reset session action. */
  const handleResetSession = useCallback(() => {
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
  const [sessions, setSessions] = useState<SupabaseSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SupabaseSession | null>(null);
  const [selectedTranscripts, setSelectedTranscripts] = useState<SupabaseTranscript[]>([]);
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackVideoUrl, setPlaybackVideoUrl] = useState<string | null>(null);

  // Fetch session history on demand
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data, error } = await supabase.from('sessions').select('*').order('started_at', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      setHistoryError('Failed to load session history: ' + (err.message || err.toString()));
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle session click for playback
  const handleSessionClick = async (session: SupabaseSession) => {
    setSelectedSession(session);
    setShowPlayback(true);
    setPlaybackVideoUrl(null);
    try {
      const transcripts = await getTranscripts(session.id);
      setSelectedTranscripts(transcripts);
      if (session.video_url) {
        const { data, error } = await supabase.storage
          .from('session-videos')
          .createSignedUrl(session.video_url, 60 * 60);
        if (error) {
          setPlaybackVideoUrl(null);
        } else {
          setPlaybackVideoUrl(data?.signedUrl || null);
        }
      } else {
        setPlaybackVideoUrl(null);
      }
    } catch (err: any) {
      setSelectedTranscripts([]);
      setPlaybackVideoUrl(null);
    }
  };

  // UI for session history sidebar
  const historySidebar = (
    <aside className="fixed top-0 right-0 w-80 h-full bg-[var(--color-background-secondary)] shadow-2xl z-50 p-4 overflow-y-auto border-l border-[var(--color-border-primary)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Session History</h2>
        <button onClick={() => setShowHistory(false)} className="text-lg font-bold px-2 py-1 rounded hover:bg-[var(--color-background-tertiary)]">×</button>
      </div>
      {historyLoading && <div className="text-center text-[var(--color-text-muted)]">Loading...</div>}
      {historyError && <div className="text-red-400 text-center">{historyError}</div>}
      <ul className="space-y-3">
        {sessions.map(session => (
          <li key={session.id} className="bg-[var(--color-background-tertiary)] rounded-lg p-3 shadow hover:shadow-lg transition cursor-pointer flex flex-col gap-1" onClick={() => handleSessionClick(session)}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-accent-400">{session.persona}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{new Date(session.started_at).toLocaleString()}</span>
            </div>
            {session.video_url && <span className="text-xs text-green-400">🎥 Video</span>}
          </li>
        ))}
      </ul>
    </aside>
  );

  // UI for playback modal
  const playbackModal = selectedSession && showPlayback && (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl p-6 max-w-2xl w-full relative">
        <button onClick={() => setShowPlayback(false)} className="absolute top-2 right-2 text-lg font-bold px-2 py-1 rounded hover:bg-[var(--color-background-tertiary)]">×</button>
        <h3 className="text-xl font-bold mb-2">Session Playback</h3>
        <div className="mb-4">
          <div className="font-semibold text-accent-400">{selectedSession.persona}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{new Date(selectedSession.started_at).toLocaleString()}</div>
        </div>
        {selectedSession.video_url ? (
          playbackVideoUrl ? (
            <video src={playbackVideoUrl} controls className="w-full rounded-lg mb-4" />
          ) : (
            <div className="text-[var(--color-text-muted)] mb-4">Loading video...</div>
          )
        ) : (
          <div className="text-[var(--color-text-muted)] mb-4">No video available for this session.</div>
        )}
        <div className="max-h-60 overflow-y-auto bg-[var(--color-background-tertiary)] rounded p-3">
          <h4 className="font-semibold mb-2">Transcripts</h4>
          <ul className="space-y-2">
            {selectedTranscripts.map(t => (
              <li key={t.id} className="text-sm">
                <span className={t.speaker === 'user' ? 'text-sky-400' : 'text-accent-400'}>[{t.speaker}]</span> {t.text}
                <span className="text-xs text-[var(--color-text-muted)] ml-2">{new Date(t.created_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (!isInitialized && !apiKeyMissing) {
    return loadingScreen;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)] overflow-hidden fade-in">
      {/* Error Banner */}
      {errorMessage && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white text-center py-2 shadow-lg animate-pulse">
          <span className="font-semibold">Error:</span> {errorMessage}
        </div>
      )}
      {/* Sidebar / Control Area */}
      <aside className={`w-full lg:w-80 xl:w-96 bg-[var(--color-background-secondary)] p-3 sm:p-4 shadow-lg flex-shrink-0 lg:h-full lg:overflow-y-auto space-y-4 ${TRANSITION_MEDIUM} border-r border-[var(--color-border-primary)]`}>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-teal)] to-[var(--color-accent-sky)] pt-1 pb-2 mb-1 sm:mb-2">
            Gemini Live
          </h1>
          <button onClick={() => { setShowHistory(true); fetchHistory(); }} className="text-xs px-2 py-1 rounded bg-[var(--color-accent-sky)] text-white hover:bg-[var(--color-accent-sky-hover)]">History</button>
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
                <StatusDisplay statusMessage={statusMessage} errorMessage={errorMessage} />
            </div>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className={`flex-grow p-3 sm:p-4 lg:p-6 flex flex-col space-y-4 overflow-y-auto lg:overflow-hidden h-full ${TRANSITION_MEDIUM}`}>
        {/* Video and AI Bot Visualizer Area */}
        {/* Adjust max-h for video/bot area to ensure transcripts are always visible */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 md:h-[40%] md:max-h-[300px] lg:h-[45%] lg:max-h-[350px] xl:max-h-[400px] ${TRANSITION_MEDIUM}`}>
          <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-video md:aspect-auto`}>
            <VideoPreview mediaStream={mediaStream} isVideoEnabled={localIsVideoEnabled} />
          </div>
          <div className={`w-full h-full bg-[var(--color-background-secondary)] ${BORDER_RADIUS_LG} shadow-xl overflow-hidden aspect-square md:aspect-auto`}>
            {/* Pass output audio context and gain node for AI voice visualization */}
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

      {/* Saving/Error State */}
      {isSaving && (
        <div className="fixed top-0 left-0 w-full z-50 bg-blue-900 text-white text-center py-2 shadow-lg animate-pulse">
          <span className="font-semibold">Saving session data...</span>
        </div>
      )}
      {saveError && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-700 text-white text-center py-2 shadow-lg animate-pulse">
          <span className="font-semibold">Error:</span> {saveError}
        </div>
      )}

      {showHistory && historySidebar}
      {playbackModal}
    </div>
  );
};

export default App;
