import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Core AI interaction logic and state from the custom hook
  const {
    isInitialized,
    isRecording,
    statusMessage,
    errorMessage,
    inputGainNode,
    outputAudioContext,
    outputGainNode,
    mediaStream,
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

  /** Handles the start recording action. */
  const handleStartRecording = useCallback(() => {
    startRecording(localIsVideoEnabled); // Pass current local video preference
  }, [startRecording, localIsVideoEnabled]);

  /** Handles the stop recording action. */
  const handleStopRecording = useCallback(() => {
    stopRecording();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-teal)] to-[var(--color-accent-sky)] pt-1 pb-2 mb-1 sm:mb-2">
          Gemini Live
        </h1>
        
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
    </div>
  );
};

export default App;
