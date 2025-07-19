import { GoogleGenAI, LiveServerMessage, Modality, Session, LiveServerContent, createPartFromUri, Type } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { VIDEO_FRAME_RATE, VIDEO_QUALITY, MAX_RECONNECT_ATTEMPTS, RECONNECT_DELAY_BASE_MS } from '../constants';
import type { GeminiLiveAICallbacks, SessionAnalysisResult, SupabaseTranscript } from '../types';
import { supabase } from './supabaseClient';

/**
 * Manages the connection and real-time communication with the Gemini Live API
 * for audio and video streaming. It handles device access, audio/video capture,
 * data encoding, API interaction, and playback of AI responses.
 */
export class GeminiLiveAI {
  private client: GoogleGenAI;
  private session: Session | null = null;
  public readonly inputAudioContext: AudioContext;
  public readonly outputAudioContext: AudioContext;
  private readonly _inputNode: GainNode; // For controlling microphone input volume
  private readonly _outputNode: GainNode; // For controlling AI voice output volume
  private nextStartTime = 0; // For scheduling AI audio output playback sequentially

  // User media resources
  private mediaStream: MediaStream | null = null;
  private mediaStreamSourceNode: MediaStreamAudioSourceNode | null = null; // Connects MediaStream to Web Audio API
  private scriptProcessorNode: ScriptProcessorNode | null = null; // Processes raw audio from microphone

  // AI audio output resources
  private sources = new Set<AudioBufferSourceNode>(); // Active AI audio output sources being played

  private callbacks: GeminiLiveAICallbacks; // Callbacks for UI updates
  private reconnectAttempts = 0;
  private isDisposed = false; // Flag to prevent operations on a disposed instance
  private isVideoTrackGloballyEnabled = true; // User preference for video state

  // Video capture resources
  private videoElement: HTMLVideoElement | null = null; // Hidden video element for rendering MediaStream frames
  private canvasElement: HTMLCanvasElement | null = null; // Canvas for capturing frames from videoElement
  private videoFrameCaptureIntervalId: number | null = null; // Interval ID for video frame capture

  /**
   * Initializes the GeminiLiveAI service.
   * @param callbacks - Callback functions for status updates, errors, transcripts, and media stream availability.
   * @param systemInstruction - Optional system instruction to guide the AI's persona and behavior.
   * @throws Error if API_KEY is not set or AudioContext cannot be created.
   */
  constructor(callbacks: GeminiLiveAICallbacks, private systemInstruction?: string) {
    this.callbacks = callbacks;

    if (!process.env.API_KEY) {
      const apiKeyError = "API_KEY environment variable not set. Please configure it.";
      this.callbacks.onErrorUpdate(apiKeyError);
      this.callbacks.onStatusUpdate(`Error: ${apiKeyError}`);
      throw new Error(apiKeyError);
    }

    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    try {
      // Input context for microphone processing
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output context for AI voice playback
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } catch (e: unknown) {
      const audioContextError = `Failed to create AudioContext: ${(e as Error).message}. This browser may not be supported.`;
      this.callbacks.onErrorUpdate(audioContextError);
      this.callbacks.onStatusUpdate(`Error: ${audioContextError}`);
      throw new Error(audioContextError);
    }

    this._inputNode = this.inputAudioContext.createGain();
    this._outputNode = this.outputAudioContext.createGain();

    this.initOutputAudio();
    this.connect(); // Attempt initial connection
  }

  /**
   * Initializes the output audio pipeline by connecting the output gain node
   * to the audio context's destination (speakers).
   */
  private initOutputAudio(): void {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this._outputNode.connect(this.outputAudioContext.destination);
  }

  /**
   * Establishes or re-establishes a connection to the Gemini Live API.
   * Handles session setup and callbacks for API events.
   */
  private async connect(): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    // Model supporting native audio input and output for more natural interaction.
    const model = 'gemini-2.0-flash-live-001';
    this.callbacks.onStatusUpdate('Connecting to Gemini...');

    // Configuration for the Live API session.
    const liveConnectConfig = {
      responseModalities: [Modality.AUDIO], // Expect audio responses from AI
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } }, // Example voice
      inputAudioTranscription: {}, // Enable transcription of user's audio
      outputAudioTranscription: {}, // Enable transcription of AI's audio output
      // Conditionally add system instruction if provided
      ...(this.systemInstruction && this.systemInstruction.trim() !== '' && {
        systemInstruction: { parts: [{ text: this.systemInstruction }] }
      }),
    };
    
    console.log('GeminiLiveAI: Connecting with system instruction:', this.systemInstruction ? this.systemInstruction.substring(0, 100) + '...' : 'None');

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            if (this.isDisposed) {
              return;
            }
            this.callbacks.onStatusUpdate('Connection opened. Ready.');
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          },
          onmessage: this.handleLiveServerMessage.bind(this),
          onerror: (e: Event) => {
            if (this.isDisposed) {
              return;
            }
            const errorMessage = (e instanceof ErrorEvent) ? e.message : (e instanceof Error) ? e.message : 'Unknown session error';
            console.error('Gemini Live Session Error:', e);
            this.callbacks.onErrorUpdate(`Session error: ${errorMessage}`);
            this.callbacks.onStatusUpdate(`Session error: ${errorMessage}`);
            this.callbacks.onRecordingStateChange(false); // Ensure recording state is updated
            this.disconnectAndReconnect(); // Attempt to reconnect on error
          },
          onclose: (e: CloseEvent) => {
            if (this.isDisposed && e.code !== 1000) {
              return;
            }
            this.callbacks.onStatusUpdate(`Session closed: ${e.reason || 'No reason provided'}. Code: ${e.code}`);
            this.callbacks.onRecordingStateChange(false);
            // Reconnect only on abnormal closures and if not intentionally disposed
            if (!e.wasClean && e.code !== 1000 && !this.isDisposed) {
              this.callbacks.onStatusUpdate('Attempting to reconnect...');
              // Use exponential backoff for reconnect delay
              this.disconnectAndReconnect(RECONNECT_DELAY_BASE_MS * Math.pow(2, this.reconnectAttempts));
            }
          },
        },
        config: liveConnectConfig,
      });
    } catch (e: unknown) {
      if (this.isDisposed) {
        return;
      }
      const errorMessage = (e instanceof Error) ? e.message : 'Unknown connection error';
      console.error('Failed to connect to Gemini Live API:', e);
      this.callbacks.onErrorUpdate(`Connection failed: ${errorMessage}`);
      this.callbacks.onStatusUpdate(`Error: Connection failed. ${errorMessage}`);
      this.callbacks.onRecordingStateChange(false);
      // Attempt reconnect for generic errors, not for auth/permission issues, and only if not disposed.
      if (!errorMessage.toLowerCase().includes("api key") &&
        !errorMessage.toLowerCase().includes("permission denied") &&
        !this.isDisposed) {
        this.disconnectAndReconnect(RECONNECT_DELAY_BASE_MS * Math.pow(2, this.reconnectAttempts));
      }
    }
  }

  /**
   * Handles incoming messages from the Gemini Live server, processing audio,
   * transcripts, and control signals.
   * @param message - The `LiveServerMessage` received from the API.
   */
  private async handleLiveServerMessage(message: LiveServerMessage): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    const serverContent: LiveServerContent | undefined = message.serverContent;
    const isTurnComplete = !!serverContent?.turnComplete;

    // Handle AI audio output
    const audioPart = serverContent?.modelTurn?.parts?.find(part => part.inlineData?.data);
    if (audioPart?.inlineData?.data) {
      await this.playReceivedAudio(audioPart.inlineData.data);
    }

    // Handle interruption signal from server
    if (serverContent?.interrupted) {
      this.stopAllPlayingAudio();
      if (!this.isDisposed) {
        this.callbacks.onStatusUpdate('Input interrupted by server.');
      }
    }

    // Handle user transcript updates
    const inputTranscription = serverContent?.inputTranscription;
    if (inputTranscription?.text && this.callbacks.onUserTranscriptUpdate && !this.isDisposed) {
      const modelIsActiveInThisMessage = !!(serverContent?.modelTurn || serverContent?.outputTranscription);
      // User transcript is final if the turn is complete AND the model isn't also active in this same message.
      const userIsFinalState = isTurnComplete ? !modelIsActiveInThisMessage : false;
      this.callbacks.onUserTranscriptUpdate(inputTranscription.text, userIsFinalState);
    }

    // Handle model transcript updates
    const modelTurn = serverContent?.modelTurn;
    const modelAudioTranscription = serverContent?.outputTranscription;
    if (this.callbacks.onModelTranscriptUpdate && !this.isDisposed) {
      if (modelAudioTranscription?.text) {
        this.callbacks.onModelTranscriptUpdate(modelAudioTranscription.text, isTurnComplete);
      } else if (modelTurn) {
        // Fallback to text part in modelTurn if direct outputTranscription is not available.
        const textPart = modelTurn.parts?.find(p => typeof p.text === 'string');
        if (textPart?.text) {
          this.callbacks.onModelTranscriptUpdate(textPart.text, isTurnComplete);
        }
      }
    }
  }

  /**
   * Decodes and plays audio data received from the AI.
   * Schedules audio playback to ensure sequential output.
   * @param base64AudioData - Base64 encoded audio data string.
   */
  private async playReceivedAudio(base64AudioData: string): Promise<void> {
    // Ensure playback starts no earlier than the current time or the scheduled end of previous audio.
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    try {
      const audioBuffer = await decodeAudioData(
        decode(base64AudioData),
        this.outputAudioContext,
        24000, // Gemini speech output is typically 24kHz
        1      // Mono channel
      );

      if (this.isDisposed || audioBuffer.length === 0) {
        return;
      } // Don't play if disposed or buffer is empty.

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._outputNode); // Connect to the main output gain node
      // Remove source from active set when playback ends
      source.addEventListener('ended', () => this.sources.delete(source));

      source.start(this.nextStartTime); // Start playback at the scheduled time
      this.nextStartTime += audioBuffer.duration; // Schedule next audio after this one finishes
      this.sources.add(source); // Add to active sources set
    } catch (e: unknown) {
      if (this.isDisposed) {
        return;
      }
      console.error('Error processing received AI audio:', e);
      this.callbacks.onErrorUpdate(`Failed to play AI audio: ${(e as Error).message}`);
    }
  }

  /**
   * Stops all currently playing AI audio output.
   */
  private stopAllPlayingAudio(): void {
    this.sources.forEach(source => {
      try {
        source.stop(); // Stop playback
      } catch (e) {
        // This can throw if already stopped or context is closing, usually safe to ignore.
        console.warn("Error stopping an audio source (might be already stopped):", e);
      }
    });
    this.sources.clear(); // Clear the set of active sources
    if (!this.isDisposed) {
      // Reset next start time to current time for future playback.
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  /**
   * Enables or disables the video track in the `mediaStream`.
   * Also starts or stops video frame capture based on the new state and recording status.
   * @param enable - True to enable the video track, false to disable.
   */
  public setVideoTrackEnabled(enable: boolean): void {
    this.isVideoTrackGloballyEnabled = enable;
    this.mediaStream?.getVideoTracks().forEach(track => track.enabled = enable);

    // If enabling video and recording is active, start frame capture.
    // If disabling video, stop frame capture.
    if (enable && this.isRecordingActive()) {
      this.startVideoFrameCapture();
    } else {
      this.stopVideoFrameCapture();
    }
  }

  /**
   * Checks if audio or video recording/capture is currently active.
   * @returns True if recording (audio ScriptProcessorNode active) or video capture (interval active) is ongoing.
   */
  private isRecordingActive(): boolean {
    return !!(this.scriptProcessorNode || this.videoFrameCaptureIntervalId);
  }

  /**
   * Starts recording audio and, if enabled, video.
   * Requests device access, sets up audio processing pipeline, and initiates video frame capture.
   * @param initialVideoEnabled - Optional flag to set the initial state of video track (enabled/disabled).
   */
  public async startRecording(initialVideoEnabled?: boolean): Promise<void> {
    if (this.isDisposed || this.isRecordingActive()) {
      if (!this.isDisposed) {
        this.callbacks.onStatusUpdate(this.isRecordingActive() ? 'Already recording.' : 'Instance disposed, cannot start recording.');
      }
      return;
    }

    if (typeof initialVideoEnabled === 'boolean') {
      this.isVideoTrackGloballyEnabled = initialVideoEnabled;
    }

    // Ensure session is active before starting recording. Attempt to connect if not.
    if (!this.session) {
      this.callbacks.onStatusUpdate('Session not active. Attempting to connect...');
      this.callbacks.onErrorUpdate('Attempting to record without an active session. Trying to connect...');
      await this.connect();
      if (this.isDisposed || !this.session) {
        if (!this.isDisposed) {
          this.callbacks.onErrorUpdate('Failed to establish session. Please reset.');
          this.callbacks.onStatusUpdate('Failed to connect. Please reset session.');
        }
        return;
      }
      this.callbacks.onStatusUpdate('Session re-established. Proceeding with recording.');
      if (!this.isDisposed) {
        this.callbacks.onErrorUpdate('');
      } // Clear previous error messages
    }

    // Resume audio contexts if they were suspended (e.g., by browser policies).
    await Promise.all([
      this.inputAudioContext.state === 'suspended' ? this.inputAudioContext.resume() : Promise.resolve(),
      this.outputAudioContext.state === 'suspended' ? this.outputAudioContext.resume() : Promise.resolve(),
    ]);
    if (this.isDisposed) {
      return;
    } // Check again after async operations

    this.callbacks.onStatusUpdate('Requesting device access (microphone/camera)...');
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: VIDEO_FRAME_RATE } },
      });

      if (this.isDisposed) { // If disposed while waiting for media, cleanup and exit.
        this.cleanupRecordingResources(); return;
      }
      this.callbacks.onMediaStreamAvailable(this.mediaStream);
      // Set video track state based on global flag
      this.mediaStream.getVideoTracks().forEach(track => track.enabled = this.isVideoTrackGloballyEnabled);
      this.callbacks.onStatusUpdate('Device access granted. Starting audio/video capture...');

      // Setup audio processing pipeline
      this.mediaStreamSourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      this.mediaStreamSourceNode.connect(this._inputNode); // Connect stream to input gain node

      const bufferSize = 4096; // Standard buffer size for ScriptProcessorNode
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(bufferSize, 1, 1); // 1 input, 1 output channel
      this.scriptProcessorNode.onaudioprocess = this.handleAudioProcess.bind(this); // Process audio data
      this._inputNode.connect(this.scriptProcessorNode); // Connect gain node to script processor

      // Connect script processor to destination via a muted gain node to keep it processing.
      // This is a common workaround for ScriptProcessorNode to ensure onaudioprocess fires.
      const dummyGain = this.inputAudioContext.createGain();
      dummyGain.gain.value = 0; // Mute it
      this.scriptProcessorNode.connect(dummyGain);
      dummyGain.connect(this.inputAudioContext.destination);

      // Start video frame capture if video is globally enabled and a track is active
      if (this.isVideoTrackGloballyEnabled && this.mediaStream.getVideoTracks().some(t => t.enabled)) {
        this.startVideoFrameCapture();
      }

      this.callbacks.onRecordingStateChange(true);
      this.callbacks.onStatusUpdate('🔴 Recording...');
    } catch (err: unknown) {
      if (this.isDisposed) {
        return;
      }
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown microphone/camera access error';
      console.error('Error starting recording (device access):', err);
      this.callbacks.onErrorUpdate(`Device error: ${errorMessage}`);
      this.callbacks.onStatusUpdate(`Error: ${errorMessage}`);
      this.callbacks.onRecordingStateChange(false);
      this.callbacks.onMediaStreamAvailable(null); // Clear stream on error
      this.cleanupRecordingResources(); // Ensure resources are freed
    }
  }

  /**
   * Handles the `onaudioprocess` event from the `ScriptProcessorNode`.
   * Extracts PCM data from the input buffer and sends it to the Gemini session.
   * @param audioProcessingEvent - The `AudioProcessingEvent` containing audio data.
   */
  private handleAudioProcess(audioProcessingEvent: AudioProcessingEvent): void {
    if (this.isDisposed || !this.session || !this.scriptProcessorNode) {
      return;
    }
    // Get PCM data (Float32Array) from the input buffer for the first channel.
    const pcmData = audioProcessingEvent.inputBuffer.getChannelData(0);
    try {
      // Create a blob (base64 encoded Int16 PCM) and send it to the session.
      if (this.session) {
        this.session.sendRealtimeInput({ media: createBlob(pcmData) });
      }
    } catch (e: unknown) {
      if (this.isDisposed) {
        return;
      }
      const errorMessage = (e instanceof Error) ? e.message : 'Unknown error sending audio data';
      console.error("Error sending audio data to Gemini:", e);
      this.callbacks.onErrorUpdate(`Error sending audio: ${errorMessage}`);
      this.stopRecording(); // Stop recording on critical send error
    }
  }

  /**
   * Initiates video frame capture from the `mediaStream`.
   * Sets up a hidden video element and a canvas to draw frames, then captures
   * frames at a specified rate.
   */
  private startVideoFrameCapture(): void {
    if (!this.mediaStream || !this.session || this.videoFrameCaptureIntervalId || !this.isVideoTrackGloballyEnabled) {
      return;
    }

    const videoTrack = this.mediaStream.getVideoTracks().find(t => t.enabled);
    if (!videoTrack) { // No enabled video track found
      this.stopVideoFrameCapture(); // Ensure capture is stopped if conditions aren't met
      return;
    }

    // Create a hidden video element to render the stream
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = this.mediaStream;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true; // Important for iOS
    this.videoElement.play().catch(e => console.warn("Hidden video element play() error (often benign):", e));

    // Create a canvas to capture frames from the video element
    this.canvasElement = document.createElement('canvas');
    const settings = videoTrack.getSettings();
    this.canvasElement.width = settings.width || 640; // Use actual track settings or fallback
    this.canvasElement.height = settings.height || 480;
    const ctx = this.canvasElement.getContext('2d');

    if (!ctx) {
      console.error("Could not get 2D context from canvas for video frame capture.");
      this.cleanupVideoFrameCaptureResources(); // Clean up if context fails
      return;
    }

    // Start interval to capture frames
    this.videoFrameCaptureIntervalId = window.setInterval(() => {
      // Pre-condition check within interval to ensure resources are still valid
      if (this.isDisposed || !this.session || !this.mediaStream || !this.videoElement || !this.canvasElement || !ctx || !this.isVideoTrackGloballyEnabled || !videoTrack.enabled) {
        this.stopVideoFrameCapture(); // Stop if conditions are no longer met
        return;
      }
      try {
        // Draw current video frame to canvas
        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        // Convert canvas content to Blob (JPEG)
        this.canvasElement.toBlob(this.handleVideoBlob.bind(this), 'image/jpeg', VIDEO_QUALITY);
      } catch (e: unknown) {
        if (this.isDisposed) {
          return;
        }
        this.handleVideoProcessingError("Error capturing or drawing video frame to canvas", e);
      }
    }, 1000 / VIDEO_FRAME_RATE); // Interval based on desired frame rate
  }

  /**
   * Handles the video frame Blob from `canvas.toBlob()`.
   * Reads the Blob as a Base64 data URL and sends it to the Gemini session.
   * @param blob - The video frame Blob (image/jpeg), or null if conversion failed.
   */
  private async handleVideoBlob(blob: globalThis.Blob | null): Promise<void> { // Use globalThis.Blob for clarity
    if (this.isDisposed || !this.session || !blob) {
      return;
    }
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (this.isDisposed || !this.session) {
          return;
        }
        try {
          const resultString = reader.result as string;
          // Basic validation for Data URL format
          if (!resultString || !resultString.startsWith('data:image/jpeg;base64,')) {
            throw new Error("Invalid video frame data URL format.");
          }
          const base64Data = resultString.split(',')[1];
          // Send video frame data to the session
          if (this.session) {
            this.session.sendRealtimeInput({ video: { data: base64Data, mimeType: 'image/jpeg' } });
          }
        } catch (e) { this.handleVideoProcessingError("Error processing video frame from FileReader", e); }
      };
      reader.onerror = (errorEvent) => { // Handle FileReader specific errors
        if (this.isDisposed) {
          return;
        }
        this.handleVideoProcessingError("FileReader error for video blob", errorEvent.target?.error);
      };
      reader.readAsDataURL(blob);
    } catch (e) { this.handleVideoProcessingError("Error creating FileReader for video blob", e); }
  }

  /**
   * Centralized error handler for video processing steps.
   * @param message - A descriptive message for the error context.
   * @param error - The actual error object or details.
   */
  private handleVideoProcessingError(message: string, error?: unknown): void {
    if (this.isDisposed) {
      return;
    }
    const errorDetails = (error instanceof Error) ? error.message : String(error || "Unknown error");
    console.error(`${message}:`, errorDetails);
    // Provide a concise error message to the UI callback.
    this.callbacks.onErrorUpdate(`${message.substring(0, 30)}: ${errorDetails.substring(0, 70)}`);
  }

  /**
   * Stops video frame capture and cleans up associated resources.
   */
  private stopVideoFrameCapture(): void {
    if (this.videoFrameCaptureIntervalId) {
      window.clearInterval(this.videoFrameCaptureIntervalId);
      this.videoFrameCaptureIntervalId = null;
    }
    this.cleanupVideoFrameCaptureResources();
  }

  /**
   * Cleans up resources specifically used for video frame capture (video element, canvas).
   */
  private cleanupVideoFrameCaptureResources(): void {
    if (this.videoElement) {
      if (!this.videoElement.paused) {
        this.videoElement.pause();
      }
      this.videoElement.srcObject = null; // Release media stream from element
      this.videoElement = null; // Allow GC
    }
    this.canvasElement = null; // Allow GC
  }

  /**
   * Stops audio and video recording and cleans up all associated resources.
   * Notifies UI about the recording state change.
   */
  public stopRecording(): void {
    if (!this.isRecordingActive()) { // If not recording, no action needed.
      if (!this.isDisposed) {
        this.callbacks.onStatusUpdate('Not currently recording.');
      }
      return;
    }
    if (!this.isDisposed) {
      this.callbacks.onStatusUpdate('Stopping recording...');
    }

    this.stopVideoFrameCapture(); // Stop video capture first
    this.cleanupAudioRecordingResources(); // Then audio resources
    this.cleanupMediaStream(); // Finally, the media stream itself

    if (!this.isDisposed) {
      this.callbacks.onRecordingStateChange(false);
      this.callbacks.onStatusUpdate('Recording stopped. Click Start to talk.');
      this.callbacks.onMediaStreamAvailable(null); // Clear media stream state in UI
    }
  }

  /**
   * Cleans up resources specifically related to audio recording (ScriptProcessorNode, MediaStreamAudioSourceNode).
   */
  private cleanupAudioRecordingResources(): void {
    if (this.scriptProcessorNode) {
      this.scriptProcessorNode.disconnect(); // Disconnect from audio graph
      this.scriptProcessorNode.onaudioprocess = null; // Remove event listener
      this.scriptProcessorNode = null;
    }
    if (this.mediaStreamSourceNode) {
      this.mediaStreamSourceNode.disconnect(); // Disconnect from audio graph
      this.mediaStreamSourceNode = null;
    }
    // _inputNode is persistent and part of the main audio graph, not cleaned here unless disposing.
  }

  /**
   * Stops all tracks in the current `mediaStream` and nullifies the stream reference.
   */
  private cleanupMediaStream(): void {
    this.mediaStream?.getTracks().forEach(track => track.stop()); // Stop all tracks (mic, camera)
    this.mediaStream = null;
  }

  /**
   * General cleanup utility called during recording stop or error states.
   * Ensures all recording-related resources are released.
   */
  private cleanupRecordingResources(): void {
    this.cleanupAudioRecordingResources();
    this.cleanupVideoFrameCaptureResources();
    this.cleanupMediaStream();
  }

  /**
   * Resets the current Gemini Live session: stops recording, closes the current session,
   * and attempts to establish a new one.
   */
  public async reset(): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    this.callbacks.onStatusUpdate('Resetting session...');
    this.stopRecording(); // Stop any active recording and clean up resources
    this.stopAllPlayingAudio(); // Stop any AI voice output

    if (this.session) {
      try { this.session.close(); } catch (e) { console.warn("Error closing session during reset:", e); }
      this.session = null;
    }
    this.reconnectAttempts = 0; // Reset reconnect counter for the new session

    await this.connect(); // Attempt to establish a new session
    if (this.isDisposed) {
      return;
    }

    // Update UI based on whether the new session was established
    this.callbacks.onStatusUpdate(this.session ? 'Session reset. Ready.' : 'Session reset. Failed to reconnect.');
    if (!this.session && !this.isDisposed) {
      this.callbacks.onErrorUpdate('Failed to re-establish session after reset.');
    }
  }

  /**
   * Handles disconnection and attempts reconnection with exponential backoff.
   * @param delayMs - The delay in milliseconds before attempting to reconnect.
   */
  private disconnectAndReconnect(delayMs = 0): void {
    if (this.isDisposed) {
      return;
    }
    this.stopRecording(); // Ensure recording is stopped before attempting to close/reopen session

    if (this.session) {
      try { this.session.close(); } catch (e) { console.warn("Error closing session for reconnect:", e); }
      this.session = null;
    }
    this.stopAllPlayingAudio(); // Also stop any AI speech

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (!this.isDisposed) {
        this.callbacks.onErrorUpdate("Max reconnection attempts reached. Please check connection/API key and reset manually.");
        this.callbacks.onStatusUpdate("Failed to reconnect after multiple attempts.");
      }
      return;
    }

    this.reconnectAttempts++;
    // Calculate delay with exponential backoff, ensuring a base delay if delayMs is 0.
    const actualDelay = delayMs > 0 ? delayMs : RECONNECT_DELAY_BASE_MS * Math.pow(2, this.reconnectAttempts - 1);
    if (!this.isDisposed) {
      this.callbacks.onStatusUpdate(`Attempting to reconnect in ${Math.round(actualDelay / 1000)}s (attempt ${this.reconnectAttempts})...`);
    }

    setTimeout(() => {
      if (!this.isDisposed) {
        this.connect();
      } // Attempt connection after delay
    }, actualDelay);
  }

  /** Gets the input gain node for microphone volume control. */
  public getInputNode(): GainNode { return this._inputNode; }
  /** Gets the output gain node for AI voice volume control. */
  public getOutputNode(): GainNode { return this._outputNode; }

  /**
   * Cleans up all resources, closes connections, stops all audio/video processing,
   * and marks the instance as disposed to prevent further operations.
   * This should be called when the service is no longer needed (e.g., component unmount).
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    console.log("Disposing GeminiLiveAI instance...");
    this.callbacks.onStatusUpdate('Disposing GeminiLiveAI instance...');

    this.stopRecording(); // This handles recording-specific resources
    this.stopAllPlayingAudio(); // Stop AI voice output

    if (this.session) {
      try { this.session.close(); } catch (e) { console.warn("Error closing session during disposal:", e); }
      this.session = null;
    }

    // Close audio contexts safely
    if (this.inputAudioContext?.state !== 'closed') {
      this.inputAudioContext.close().catch(e => console.warn("Error closing input audio context:", e));
    }
    if (this.outputAudioContext?.state !== 'closed') {
      this.outputAudioContext.close().catch(e => console.warn("Error closing output audio context:", e));
    }

    this.callbacks.onStatusUpdate('Disconnected.');
    this.callbacks.onMediaStreamAvailable(null); // Clear media stream in UI
    console.log("GeminiLiveAI instance disposed successfully.");
  }
}

/**
 * Analyze a session's video/audio/transcript using Gemini API.
 * Returns summary, key metrics, insights, and quiz.
 *
 * @param opts.videoUrl - Signed URL to the session video (webm/mp4)
 * @param opts.transcripts - Array of SupabaseTranscript
 * @param opts.audioUrl - (Optional) Signed URL to audio file if separate
 * @returns Promise<SessionAnalysisResult>
 */
export async function analyzeSessionWithGemini({
  videoUrl,
  transcripts,
  audioUrl,
  sessionId,
  persona,
  systemInstruction,
  started_at,
  ended_at,
}: {
  videoUrl?: string;
  transcripts: SupabaseTranscript[];
  audioUrl?: string;
  sessionId?: string; // For persistence
  persona?: string;
  systemInstruction?: string;
  started_at?: string | number | Date;
  ended_at?: string | number | Date;
}): Promise<SessionAnalysisResult> {
  console.log('analyzeSessionWithGemini called with:', {
    hasVideoUrl: !!videoUrl,
    hasAudioUrl: !!audioUrl,
    transcriptCount: transcripts.length,
    sessionId,
    persona,
    hasSystemInstruction: !!systemInstruction
  });

  // --- 1. Prepare transcript text ---
  const transcriptText = transcripts
    .map(t => `${t.speaker === 'user' ? 'User' : 'AI'}: ${t.text}`)
    .join('\n');

  console.log('Transcript text prepared:', transcriptText.substring(0, 200) + '...');

  // --- 1b. Calculate session duration (in seconds) ---
  let duration = 0;
  // Prefer started_at/ended_at if available
  if (started_at && ended_at) {
    const start = typeof started_at === 'string' ? new Date(started_at).getTime() : (started_at instanceof Date ? started_at.getTime() : started_at);
    const end = typeof ended_at === 'string' ? new Date(ended_at).getTime() : (ended_at instanceof Date ? ended_at.getTime() : ended_at);
    if (!isNaN(start) && !isNaN(end) && end > start) {
      duration = Math.max(0, Math.round((end - start) / 1000));
    }
  }
  // Fallback to transcript timestamps
  if (duration === 0 && transcripts.length > 1) {
    const first = transcripts[0].timestamp_ms;
    const last = transcripts[transcripts.length - 1].timestamp_ms;
    duration = Math.max(0, Math.round((last - first) / 1000));
  }
  // Fallback to video metadata (browser only)
  if (duration === 0 && videoUrl && typeof document !== 'undefined') {
    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          if (!isNaN(video.duration) && video.duration > 0) {
            duration = Math.round(video.duration);
          }
          resolve(true);
        };
        video.onerror = () => resolve(false);
      });
    } catch { }
  }

  console.log('Session duration calculated:', duration, 'seconds');

  // --- 2. Prepare Gemini API client with API key ---
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error('Gemini API key is missing. Set process.env.API_KEY or process.env.GEMINI_API_KEY.');
    throw new Error('Gemini API key is missing. Please set it in your environment.');
  }
  console.log('API key found, creating Gemini client...');
  const ai = new GoogleGenAI({ apiKey });

  // --- 3. Compose prompt ---
  let prompt = `Analyze the following session.\n`;
  if (persona) {
    prompt += `Persona: ${persona}\n`;
  }
  if (systemInstruction) {
    prompt += `System Instruction: ${systemInstruction}\n`;
  }
  if (videoUrl) {
    prompt += `The session video is provided.\n`;
  } else if (audioUrl) {
    prompt += `The session audio is provided.\n`;
  }
  prompt += `Here is the transcript (speaker: text):\n${transcriptText}\n`;
  prompt += `\nSession duration (seconds): ${duration}\n`;

  // Persona-specific metrics
  if (persona === 'Interview Coach') {
    prompt += `\nAdditionally, analyze the candidate's use of the STAR method (Situation, Task, Action, Result) as a percentage (0-100), and rate their clarity on a scale of 1-10. Return these as 'starUsage' and 'clarity' in keyMetrics.`;
  } else if (persona === 'Dating Coach') {
    prompt += `\nAdditionally, rate the user's confidence and authenticity on a scale of 1-10. Return these as 'confidence' and 'authenticity' in keyMetrics.`;
  } else if (persona === 'Motivational Mentor') {
    prompt += `\nAdditionally, rate the user's motivation and confidence on a scale of 1-10. Return these as 'motivation' and 'confidence' in keyMetrics.`;
  } else if (persona === 'Friendly Conversationalist') {
    prompt += `\nAdditionally, rate the user's engagement and comfort level on a scale of 1-10. Return these as 'engagement' and 'comfort' in keyMetrics.`;
  } else if (persona === 'Tech Support Agent') {
    prompt += `\nAdditionally, rate the user's understanding of the solution and frustration level on a scale of 1-10. Return these as 'understanding' and 'frustration' in keyMetrics.`;
  } else if (persona === 'Language Tutor') {
    prompt += `\nAdditionally, rate the user's language accuracy (0-100 percent) and fluency (1-10). Return these as 'accuracy' and 'fluency' in keyMetrics.`;
  } else if (persona === 'Fitness Coach') {
    prompt += `\nAdditionally, rate the user's energy and goal clarity on a scale of 1-10. Return these as 'energy' and 'goalClarity' in keyMetrics.`;
  } else if (persona === 'Standup Comedian') {
    prompt += `\nAdditionally, rate the user's laughter (1-10) and engagement (1-10). Return these as 'laughter' and 'engagement' in keyMetrics.`;
  }

  prompt += `\nPlease provide:\n- A concise summary of the session\n- Key metrics (duration, number of user/AI turns, sentiment, and any persona-specific metrics)\n- 3-5 key insights\n- A quiz (2-3 questions with answers)\n- Any visual or audio highlights if possible\nReturn the result as JSON with fields: summary, keyMetrics, insights, quiz, visualHighlights, audioHighlights. The duration in keyMetrics should match the provided session duration. Persona-specific metrics should be included in keyMetrics if requested.`;

  // --- 4. Prepare Gemini content parts ---
  let contents: any[] = [];
  let filePart: any = null;
  let mimeType = '';
  if (typeof videoUrl === 'string') {
    console.log('Processing video URL:', videoUrl);
    if (videoUrl.startsWith('http') && videoUrl.includes('youtube.com')) {
      filePart = {
        fileData: {
          fileUri: videoUrl,
        },
      };
      contents = [filePart, { text: prompt }];
    } else {
      // Assume direct video file (webm/mp4)
      mimeType = videoUrl.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
      console.log('Uploading video file to Gemini, mimeType:', mimeType);
      // Upload to Gemini File API
      const videoBlob = await fetch(videoUrl).then(r => r.blob());
      console.log('Video blob size:', videoBlob.size, 'bytes');
      
      // Check if video file is too small (likely corrupted or empty)
      if (videoBlob.size < 1000) { // Less than 1KB
        console.warn('Video file is too small, likely corrupted. Falling back to transcript-only analysis.');
        contents = [{ text: prompt }];
      } else {
        const myfile = await ai.files.upload({
          file: new File([videoBlob], 'session-video', { type: mimeType }),
          config: { mimeType },
        });
        if (!myfile.name) {
          throw new Error('Gemini file upload did not return a file name.');
        }
        console.log('Video file uploaded successfully:', myfile.name);
        try {
          await waitForGeminiFileActive(ai, myfile.name);
        } catch (statusErr) {
          console.warn('File status check failed, but proceeding with analysis:', statusErr);
          // Continue with analysis even if status check fails
        }
        filePart = createPartFromUri(myfile.uri ?? '', myfile.mimeType ?? '');
        contents = [filePart, { text: prompt }];
      }
    }
  } else if (typeof audioUrl === 'string') {
    console.log('Processing audio URL:', audioUrl);
    // Audio file
    mimeType = audioUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/mpeg';
    console.log('Uploading audio file to Gemini, mimeType:', mimeType);
    const audioBlob = await fetch(audioUrl).then(r => r.blob());
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    
    // Check if audio file is too small (likely corrupted or empty)
    if (audioBlob.size < 1000) { // Less than 1KB
      console.warn('Audio file is too small, likely corrupted. Falling back to transcript-only analysis.');
      contents = [{ text: prompt }];
    } else {
      const myfile = await ai.files.upload({
        file: new File([audioBlob], 'session-audio', { type: mimeType }),
        config: { mimeType },
      });
      if (!myfile.name) {
        throw new Error('Gemini file upload did not return a file name.');
      }
      console.log('Audio file uploaded successfully:', myfile.name);
      try {
        await waitForGeminiFileActive(ai, myfile.name);
      } catch (statusErr) {
        console.warn('Audio file status check failed, but proceeding with analysis:', statusErr);
        // Continue with analysis even if status check fails
      }
      filePart = createPartFromUri(myfile.uri ?? '', myfile.mimeType ?? '');
      contents = [filePart, { text: prompt }];
    }
  } else {
    console.log('No video or audio URL provided, using transcript only');
    // Transcript only
    contents = [{ text: prompt }];
  }

  // --- 5. Define response schema for structured output ---
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      keyMetrics: {
        type: Type.OBJECT,
        properties: {
          duration: { type: Type.NUMBER },
          userTurns: { type: Type.NUMBER },
          aiTurns: { type: Type.NUMBER },
          sentiment: { type: Type.STRING },
        },
        propertyOrdering: ['duration', 'userTurns', 'aiTurns', 'sentiment'],
      },
      insights: { type: Type.ARRAY, items: { type: Type.STRING } },
      quiz: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          propertyOrdering: ['question', 'answer'],
        },
      },
      visualHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
      audioHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    propertyOrdering: [
      'summary',
      'keyMetrics',
      'insights',
      'quiz',
      'visualHighlights',
      'audioHighlights',
    ],
  };

  // --- 6. Call Gemini API for structured output ---
  let result: SessionAnalysisResult | null = null;
  try {
    console.log('Calling Gemini API with contents length:', contents.length);
    console.log('Prompt being sent:', prompt.substring(0, 200) + '...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });
    console.log('Gemini API response received:', response);
    console.log('Response text length:', response.text?.length || 0);
    
    // Parse JSON result
    if (typeof response.text === 'string') {
      console.log('Parsing JSON response...');
      result = JSON.parse(response.text);
      console.log('Successfully parsed analysis result:', result);
    } else {
      console.log('Response is already parsed:', response.text);
      result = response.text;
    }
  } catch (err) {
    console.error('Gemini analysis failed with error:', err);
    // Fallback: transcript-only analysis
    if (contents.length > 1) {
      console.log('Attempting fallback with transcript-only analysis...');
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        console.log('Fallback response received:', fallbackResponse);
        result = typeof fallbackResponse.text === 'string' ? JSON.parse(fallbackResponse.text) : fallbackResponse.text;
        console.log('Fallback analysis result:', result);
      } catch (fallbackErr) {
        console.error('Fallback analysis also failed:', fallbackErr);
        throw fallbackErr;
      }
    } else {
      throw err;
    }
  }

  // --- 7. Save analysis to database if sessionId provided ---
  if (sessionId && result) {
    try {
      console.log('Saving analysis to database for session:', sessionId);
      const { error } = await supabase
        .from('sessions')
        .update({
          metadata: {
            analysis: result,
            lastAnalyzed: new Date().toISOString(),
          },
        })
        .eq('id', sessionId);
      
      if (error) {
        console.error('Failed to save analysis to database:', error);
      } else {
        console.log('Analysis saved to database successfully');
      }
    } catch (saveErr) {
      console.error('Error saving analysis to database:', saveErr);
    }
  }

  console.log('analyzeSessionWithGemini completed successfully');
  return result;
}

// Helper: Wait for Gemini file to become ACTIVE
async function waitForGeminiFileActive(ai: any, fileName: string, maxWaitMs = 10000, pollMs = 500) {
  const start = Date.now();
  let lastError = null;
  
  while (Date.now() - start < maxWaitMs) {
    try {
      const file = await ai.files.get(fileName);
      console.log('File status check:', fileName, file);
      
      // Handle null/undefined file response
      if (!file) {
        console.warn('File not found, retrying...', fileName);
        await new Promise(res => setTimeout(res, pollMs));
        continue;
      }
      
      // Check if file has a state property
      if (file.state === 'ACTIVE') {
        console.log('File is now ACTIVE:', fileName);
        return file;
      }
      if (file.state === 'FAILED') {
        throw new Error('Gemini file upload failed: ' + (file.error?.message || 'Unknown error'));
      }
      if (file.state === 'PROCESSING') {
        console.log('File is still processing:', fileName);
        await new Promise(res => setTimeout(res, pollMs));
        continue;
      }
      
      // If file exists but doesn't have a state, assume it's ready
      console.log('File exists but no state, assuming ready:', fileName);
      return file;
      
    } catch (err) {
      lastError = err;
      console.warn('Error checking file status, retrying...', err);
      await new Promise(res => setTimeout(res, pollMs));
    }
  }
  
  // If we get here, the file didn't become active in time
  console.error('File status check failed after timeout:', fileName, lastError);
  
  // Try one more time to get the file without checking state
  try {
    const file = await ai.files.get(fileName);
    if (file) {
      console.log('File found on final attempt, proceeding:', fileName);
      return file;
    }
  } catch (finalErr) {
    console.error('Final file check failed:', finalErr);
  }
  
  throw new Error('Gemini file did not become ACTIVE in time. Please try again.');
}

