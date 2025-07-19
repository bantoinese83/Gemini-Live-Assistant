import { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiLiveAI } from '../services/geminiLiveService';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';
import type { UseGeminiLiveReturn, GeminiLiveAICallbacks, VoiceSettings } from '../types';

/**
 * Custom React hook to manage interactions with the GeminiLiveAI service.
 * It handles state for API initialization, connection status, recording,
 * media streams, transcripts, and provides control functions to interact with the AI.
 *
 * @param systemInstruction - Optional system instruction to define the AI's persona. Defaults to `DEFAULT_SYSTEM_INSTRUCTION`.
 * @returns An object implementing `UseGeminiLiveReturn`, containing state variables and control functions.
 */
const useGeminiLive = (systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION, voiceSettings?: VoiceSettings): UseGeminiLiveReturn => {
  const geminiInstanceRef = useRef<GeminiLiveAI | null>(null);
  const isMountedRef = useRef(false); // Tracks component mount status to prevent state updates on unmounted components

  // Core API and connection states
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>("Initializing...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Audio contexts and media stream states
  const [inputAudioContext, setInputAudioContext] = useState<AudioContext | null>(null);
  const [inputGainNode, setInputGainNode] = useState<GainNode | null>(null);
  const [outputAudioContext, setOutputAudioContext] = useState<AudioContext | null>(null);
  const [outputGainNode, setOutputGainNode] = useState<GainNode | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Transcript states
  const [userTranscript, setUserTranscript] = useState('');
  const [userTranscriptIsFinal, setUserTranscriptIsFinal] = useState(false);
  const [modelTranscript, setModelTranscript] = useState('');
  const [modelTranscriptIsFinal, setModelTranscriptIsFinal] = useState(false);

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Refs for managing throttled transcript updates to optimize re-renders.
  // These store the latest interim transcript received before the throttle timeout.
  const latestInterimUserTranscriptRef = useRef<string>('');
  const userTranscriptThrottleTimeoutRef = useRef<number | null>(null);
  const latestInterimModelTranscriptRef = useRef<string>('');
  const modelTranscriptThrottleTimeoutRef = useRef<number | null>(null);

  // Refs to store the currently displayed transcript in the state.
  // Used to compare against the latest interim transcript to avoid redundant state updates
  // if the throttled update would set the same text that's already displayed.
  const currentDisplayedUserTranscriptRef = useRef<string>('');
  const currentDisplayedModelTranscriptRef = useRef<string>('');

  // Add buffer refs for accumulating fragments
  const userTranscriptBufferRef = useRef<string>('');
  const modelTranscriptBufferRef = useRef<string>('');

  // Effect to track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effects to keep refs in sync with state for comparison within timeouts
  useEffect(() => { currentDisplayedUserTranscriptRef.current = userTranscript; }, [userTranscript]);
  useEffect(() => { currentDisplayedModelTranscriptRef.current = modelTranscript; }, [modelTranscript]);

  // Effect for initializing and disposing the GeminiLiveAI instance.
  // This effect re-runs if `systemInstruction` changes, allowing re-initialization with a new persona.
  useEffect(() => {
    console.log('useGeminiLive: systemInstruction changed to:', systemInstruction.substring(0, 100) + '...');
    if (!process.env.API_KEY) {
      const keyError = "API_KEY environment variable is not defined. Please ensure it's set in your environment.";
      if (isMountedRef.current) {
        setStatusMessage("Error: API Key missing");
        setErrorMessage(keyError);
        setApiKeyMissing(true);
        setIsInitialized(true); // Mark as initialized even on error to stop loading screens
      }
      console.error(keyError);
      // Cleanup if API key was missing from the start
      return () => {
        geminiInstanceRef.current?.dispose();
        geminiInstanceRef.current = null;
      };
    }

    if (isMountedRef.current) {
      setApiKeyMissing(false); // Reset API key missing flag if it was previously set and now key might exist
      setStatusMessage("Initializing Gemini Live AI..."); // Set initial status
    }

    const callbacks: GeminiLiveAICallbacks = {
      onStatusUpdate: (status) => {
        if (!isMountedRef.current) {
          return;
        }
        setStatusMessage(status);
        // Clear error message if status indicates readiness or successful reset
        if (status.toLowerCase().includes("ready") || status.toLowerCase().includes("opened") || status.toLowerCase().includes("session reset")) {
          setErrorMessage(null);
        }
      },
      onErrorUpdate: (error) => {
        if (!isMountedRef.current) {
          return;
        }
        console.error("useGeminiLive Hook Error Callback:", error);
        setErrorMessage(error);
      },
      onRecordingStateChange: (recording) => {
        if (!isMountedRef.current) {
          return;
        }
        setIsRecording(recording);
        if (!recording && !errorMessage) {
          setStatusMessage('Ready');
        }
      },
      onUserTranscriptUpdate: (transcript, isFinal) => {
        if (!isMountedRef.current) {
          return;
        }
        if (userTranscriptThrottleTimeoutRef.current) {
          clearTimeout(userTranscriptThrottleTimeoutRef.current);
        }

        // DEBUG LOGGING
        console.log('[USER TRANSCRIPT]', { transcript, isFinal, prev: currentDisplayedUserTranscriptRef.current });

        // Accumulate fragments in buffer
        if (!isFinal) {
          // Only append if not already at the end
          if (!userTranscriptBufferRef.current.endsWith(transcript)) {
            userTranscriptBufferRef.current += transcript;
          }
          setUserTranscript(userTranscriptBufferRef.current);
          setUserTranscriptIsFinal(false);
        } else {
          // On final, set transcript and reset buffer
          if (!userTranscriptBufferRef.current.endsWith(transcript)) {
            userTranscriptBufferRef.current += transcript;
          }
          setUserTranscript(userTranscriptBufferRef.current);
          setUserTranscriptIsFinal(true);
          userTranscriptBufferRef.current = '';
        }
      },
      onModelTranscriptUpdate: (transcript, isFinal) => {
        if (!isMountedRef.current) {
          return;
        }
        if (modelTranscriptThrottleTimeoutRef.current) {
          clearTimeout(modelTranscriptThrottleTimeoutRef.current);
        }

        // DEBUG LOGGING
        console.log('[MODEL TRANSCRIPT]', { transcript, isFinal, prev: currentDisplayedModelTranscriptRef.current });

        // Accumulate fragments in buffer
        if (!isFinal) {
          if (!modelTranscriptBufferRef.current.endsWith(transcript)) {
            modelTranscriptBufferRef.current += transcript;
          }
          setModelTranscript(modelTranscriptBufferRef.current);
          setModelTranscriptIsFinal(false);
        } else {
          if (!modelTranscriptBufferRef.current.endsWith(transcript)) {
            modelTranscriptBufferRef.current += transcript;
          }
          setModelTranscript(modelTranscriptBufferRef.current);
          setModelTranscriptIsFinal(true);
          modelTranscriptBufferRef.current = '';
        }
      },
      onMediaStreamAvailable: (stream) => {
        if (!isMountedRef.current) {
          return;
        }
        setMediaStream(stream);
      },
      onScreenSharingStateChange: (isScreenSharing) => {
        if (!isMountedRef.current) {
          return;
        }
        setIsScreenSharing(isScreenSharing);
        // Update screen stream when screen sharing state changes
        if (isScreenSharing) {
          // Use setTimeout to ensure the screen stream is available
          setTimeout(() => {
            if (isMountedRef.current) {
              setScreenStream(geminiInstanceRef.current?.getScreenStream() || null);
            }
          }, 100);
        } else {
          setScreenStream(null);
        }
      },
    };

    let instance: GeminiLiveAI | null = null;
    try {
      instance = new GeminiLiveAI(callbacks, systemInstruction, voiceSettings);
      geminiInstanceRef.current = instance; // Store instance in ref
      if (isMountedRef.current) {
        // Set audio contexts and gain nodes from the successfully created instance
        setInputAudioContext(instance.inputAudioContext);
        setInputGainNode(instance.getInputNode());
        setOutputAudioContext(instance.outputAudioContext);
        setOutputGainNode(instance.getOutputNode());
        setIsInitialized(true); // Mark as initialized
      }
    } catch (e: unknown) {
      const initErrorMsg = (e instanceof Error) ? e.message : "Failed to initialize GeminiLiveAI service.";
      if (isMountedRef.current) {
        setStatusMessage(`Initialization Error: ${initErrorMsg}`);
        setErrorMessage(initErrorMsg);
        if (initErrorMsg.includes("API_KEY")) {
          setApiKeyMissing(true);
        }
        setIsInitialized(true); // Mark as initialized even on error to allow UI to render error state
      }
      console.error("GeminiLiveAI Initialization Error in Hook:", e);
    }

    // Cleanup function: called on component unmount or when `systemInstruction` changes (before re-running effect)
    return () => {
      // Clear any pending transcript update timeouts
      if (userTranscriptThrottleTimeoutRef.current) {
        clearTimeout(userTranscriptThrottleTimeoutRef.current);
      }
      if (modelTranscriptThrottleTimeoutRef.current) {
        clearTimeout(modelTranscriptThrottleTimeoutRef.current);
      }

      // Dispose the GeminiLiveAI instance to clean up its resources
      geminiInstanceRef.current?.dispose();
      geminiInstanceRef.current = null;

      // Clear states that depend on the instance, only if component is still considered mounted
      // (though typically cleanup runs right before unmount or dependency change)
      if (isMountedRef.current) {
        setMediaStream(null);
      }
    };
  }, [systemInstruction, voiceSettings]); // Dependency: re-initialize if systemInstruction changes.

  /** Clears all transcript data (user and model, interim and final). */
  const clearTranscripts = useCallback(() => {
    setUserTranscript('');
    setUserTranscriptIsFinal(false);
    latestInterimUserTranscriptRef.current = '';
    if (userTranscriptThrottleTimeoutRef.current) {
      clearTimeout(userTranscriptThrottleTimeoutRef.current);
    }
    userTranscriptThrottleTimeoutRef.current = null;

    setModelTranscript('');
    setModelTranscriptIsFinal(false);
    latestInterimModelTranscriptRef.current = '';
    if (modelTranscriptThrottleTimeoutRef.current) {
      clearTimeout(modelTranscriptThrottleTimeoutRef.current);
    }
    modelTranscriptThrottleTimeoutRef.current = null;
  }, []);

  /**
   * Starts the recording process.
   * Clears previous transcripts and resumes audio contexts if suspended.
   * @param initialVideoState - Optional boolean to set the initial enabled state of the video track.
   */
  const startRecording = useCallback(async (initialVideoState?: boolean) => {
    const currentAIInstance = geminiInstanceRef.current;
    if (currentAIInstance && !isRecording) { // Prevent multiple starts if already recording
      if (!isMountedRef.current) {
        return;
      }
      clearTranscripts(); // Clear previous conversation

      // Ensure audio contexts are resumed if they were suspended by the browser
      if (currentAIInstance.inputAudioContext?.state === 'suspended') {
        await currentAIInstance.inputAudioContext.resume();
      }
      if (currentAIInstance.outputAudioContext?.state === 'suspended') {
        await currentAIInstance.outputAudioContext.resume();
      }
      if (!isMountedRef.current) {
        return;
      } // Re-check mount status after async resume operations
      currentAIInstance.startRecording(initialVideoState);
    }
  }, [isRecording, clearTranscripts]); // Depends on isRecording state and clearTranscripts callback

  /** Stops the current recording session. */
  const stopRecording = useCallback(() => {
    // Check isRecording state from the hook's own state, not just geminiInstanceRef.current state,
    // to ensure consistency with the UI.
    if (isRecording) {
      geminiInstanceRef.current?.stopRecording();
    }
  }, [isRecording]); // Depends on isRecording state

  /** Resets the Gemini Live session and clears local transcripts. */
  const resetSession = useCallback(() => {
    geminiInstanceRef.current?.reset();
    // Clear local transcript states on reset, only if component is mounted.
    if (isMountedRef.current) {
      clearTranscripts();
    }
  }, [clearTranscripts]); // Depends on clearTranscripts callback

  /**
   * Toggles the enabled state of the video track.
   * @param enable - True to enable the video track, false to disable.
   */
  const setVideoTrackEnabled = useCallback((enable: boolean) => {
    geminiInstanceRef.current?.setVideoTrackEnabled(enable);
  }, []); // No dependencies as it always uses the current ref instance

  /**
   * Starts screen sharing and begins capturing screen frames to send to Gemini.
   */
  const startScreenSharing = useCallback(async () => {
    const currentAIInstance = geminiInstanceRef.current;
    if (currentAIInstance && !isScreenSharing) {
      try {
        await currentAIInstance.startScreenSharing();
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
        if (isMountedRef.current) {
          setErrorMessage(`Screen sharing failed: ${(error as Error).message}`);
        }
      }
    }
  }, [isScreenSharing]);

  /**
   * Stops screen sharing and cleans up associated resources.
   */
  const stopScreenSharing = useCallback(() => {
    if (isScreenSharing) {
      geminiInstanceRef.current?.stopScreenSharing();
    }
  }, [isScreenSharing]);

  return {
    isInitialized,
    isRecording,
    statusMessage,
    errorMessage,
    inputAudioContext,
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
    isScreenSharing,
    screenStream,
    startScreenSharing,
    stopScreenSharing,
  };
};

export default useGeminiLive;
