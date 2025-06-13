
import { useEffect, useRef, useCallback } from 'react';
import type { AIBotStyles } from '../types';
import {
  AI_BOT_ANALYSER_FFT_SIZE,
  AI_BOT_ANALYSER_SMOOTHING_TIME,
  AI_BOT_MOUTH_HEIGHT_MIN, AI_BOT_MOUTH_HEIGHT_BASE, AI_BOT_MOUTH_HEIGHT_VOL_MULTIPLIER,
  AI_BOT_MOUTH_WIDTH_MIN, AI_BOT_MOUTH_WIDTH_BASE, AI_BOT_MOUTH_WIDTH_VOL_MULTIPLIER,
  AI_BOT_HEAD_TILT_BASS_THRESHOLD, AI_BOT_HEAD_TILT_FACTOR_MULTIPLIER, AI_BOT_HEAD_TILT_VOL_MULTIPLIER, AI_BOT_BASS_BINS_PERCENTAGE,
  AI_BOT_EYE_SQUINT_MIN, AI_BOT_EYE_SQUINT_BASE, AI_BOT_EYE_SQUINT_TREBLE_MULTIPLIER, AI_BOT_EYE_SQUINT_VOL_MULTIPLIER, AI_BOT_TREBLE_BINS_START_PERCENTAGE,
  AI_BOT_EAR_WIGGLE_MIN_SCALE, AI_BOT_EAR_WIGGLE_BASE_SCALE, AI_BOT_EAR_WIGGLE_MID_MULTIPLIER, AI_BOT_EAR_WIGGLE_VOL_MULTIPLIER,
  AI_BOT_EAR_WIGGLE_ALT_OFFSET, AI_BOT_EAR_WIGGLE_ALT_REDUCTION_FACTOR, AI_BOT_MID_BINS_START_PERCENTAGE, AI_BOT_MID_BINS_END_PERCENTAGE,
  AI_BOT_EAR_WIGGLE_INTERVAL_MS, AI_BOT_EAR_WIGGLE_INTERVAL_HALF_MS,
} from '../constants';

/**
 * Represents the initial, static styles for the AI Bot.
 * These values correspond to the bot being in an idle, non-speaking state.
 */
const INITIAL_BOT_STYLES: Readonly<AIBotStyles> = Object.freeze({
  '--mh': '1', '--mw': '1', '--fx': '0%', '--erx': '0%',
  '--elh': '1', '--erh': '1', '--ealw': '1', '--earw': '1',
});

/**
 * Applies a given set of AIBotStyles (CSS custom properties) to the document's root element.
 * This function is a side effect, modifying global styles.
 * @param styles - The AIBotStyles object containing CSS custom properties to apply.
 */
const applyGlobalBotStyles = (styles: AIBotStyles): void => {
  const rootStyle = document.documentElement.style;
  Object.entries(styles).forEach(([key, value]) => {
    // Ensure value is a string, as CSS properties require string values.
    rootStyle.setProperty(key, String(value));
  });
};

/**
 * Custom hook to manage AI Bot visualization based on audio input.
 * It processes audio data from the provided `sourceNode` (expected to be the AI's voice output)
 * and dynamically updates CSS custom properties on the root HTML element to animate the AI Bot.
 * The animation occurs only when `isAssistantSpeaking` is true.
 *
 * @param audioContext - The global `AudioContext` instance for creating the `AnalyserNode`.
 * @param sourceNode - The `AudioNode` from which the AI assistant's audio is sourced. This node will be connected to an `AnalyserNode`.
 * @param isAssistantSpeaking - Boolean flag indicating if the AI assistant is currently speaking. Visualization is active only if true.
 */
const useAIBotVisualization = (
  audioContext: AudioContext | null,
  sourceNode: AudioNode | null,
  isAssistantSpeaking: boolean
): void => { // This hook is for side effects, does not return a value used for rendering.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const currentBotStylesRef = useRef<AIBotStyles>({ ...INITIAL_BOT_STYLES });

  // Memoized callback to apply styles to the document root
  const setBotStyles = useCallback((styles: AIBotStyles) => {
    currentBotStylesRef.current = styles;
    applyGlobalBotStyles(styles);
  }, []);

  // Effect to set up and tear down the audio analyser and animation loop
  useEffect(() => {
    // Ensure audio context and source node are available and context is running
    if (!audioContext || !sourceNode || audioContext.state !== 'running') {
      // If resources are unavailable, cancel any ongoing animation and reset styles.
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      setBotStyles({ ...INITIAL_BOT_STYLES });
      return; // Exit effect if prerequisites are not met
    }

    // Initialize AnalyserNode if it doesn't exist
    if (!analyserRef.current) {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = AI_BOT_ANALYSER_FFT_SIZE;
      analyser.smoothingTimeConstant = AI_BOT_ANALYSER_SMOOTHING_TIME;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const localAnalyserNode = analyserRef.current; // Cache for use in connect/disconnect

    // Connect sourceNode to the analyser. This is a critical step.
    // This allows the analyser to process audio data from the sourceNode.
    try {
      sourceNode.connect(localAnalyserNode);
    } catch (e) {
      console.error("useAIBotVisualization: Error connecting source node to analyser:", e);
      // If connection fails, ensure styles are reset and exit.
      setBotStyles({ ...INITIAL_BOT_STYLES });
      return;
    }

    /**
     * The core visualization loop. Called recursively via requestAnimationFrame.
     * Calculates audio metrics and updates bot styles if the assistant is speaking.
     * Resets styles if the assistant is not speaking.
     */
    const visualize = () => {
      if (!analyserRef.current || !dataArrayRef.current || !audioContext || audioContext.state !== 'running') {
        // This condition might be met if audioContext is closed during visualization.
        setBotStyles({ ...INITIAL_BOT_STYLES });
        // Request next frame to allow re-evaluation if context becomes available again.
        if (animationFrameIdRef.current !== null) animationFrameIdRef.current = requestAnimationFrame(visualize);
        return;
      }

      if (!isAssistantSpeaking) {
        // If assistant is not speaking, reset to initial styles.
        // Compare with current styles to avoid redundant DOM manipulation.
        if (JSON.stringify(currentBotStylesRef.current) !== JSON.stringify(INITIAL_BOT_STYLES)) {
            setBotStyles({ ...INITIAL_BOT_STYLES });
        }
        if (animationFrameIdRef.current !== null) animationFrameIdRef.current = requestAnimationFrame(visualize);
        return;
      }

      // If assistant is speaking, perform audio analysis and update styles.
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      const bufferLength = analyser.frequencyBinCount;
      analyser.getByteFrequencyData(dataArray); // Populate dataArray with frequency data.

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const averageVolume = bufferLength > 0 ? sum / bufferLength / 255 : 0; // Normalized 0-1

      const newStyles: AIBotStyles = {};

      // Mouth animation
      newStyles['--mh'] = `${Math.max(AI_BOT_MOUTH_HEIGHT_MIN, AI_BOT_MOUTH_HEIGHT_BASE + averageVolume * AI_BOT_MOUTH_HEIGHT_VOL_MULTIPLIER)}`;
      newStyles['--mw'] = `${Math.max(AI_BOT_MOUTH_WIDTH_MIN, AI_BOT_MOUTH_WIDTH_BASE + averageVolume * AI_BOT_MOUTH_WIDTH_VOL_MULTIPLIER)}`;

      // Head/Face tilt
      let bassSum = 0;
      const bassBins = Math.floor(bufferLength * AI_BOT_BASS_BINS_PERCENTAGE);
      for (let i = 0; i < bassBins; i++) bassSum += dataArray[i];
      const averageBass = bassBins > 0 ? bassSum / bassBins / 255 : 0;
      const headTiltFactor = (averageBass - AI_BOT_HEAD_TILT_BASS_THRESHOLD) * AI_BOT_HEAD_TILT_FACTOR_MULTIPLIER * Math.min(1, averageVolume * AI_BOT_HEAD_TILT_VOL_MULTIPLIER);
      newStyles['--fx'] = `${headTiltFactor}%`;
      newStyles['--erx'] = `${headTiltFactor}%`;

      // Eye squint
      let trebleSum = 0;
      const trebleStartBin = Math.floor(bufferLength * AI_BOT_TREBLE_BINS_START_PERCENTAGE);
      let trebleBinsCount = 0;
      for (let i = trebleStartBin; i < bufferLength; i++) {
        trebleSum += dataArray[i];
        trebleBinsCount++;
      }
      const averageTreble = trebleBinsCount > 0 ? trebleSum / trebleBinsCount / 255 : 0;
      const eyeSquintFactor = Math.max(AI_BOT_EYE_SQUINT_MIN, AI_BOT_EYE_SQUINT_BASE - averageTreble * AI_BOT_EYE_SQUINT_TREBLE_MULTIPLIER * Math.min(1, averageVolume * AI_BOT_EYE_SQUINT_VOL_MULTIPLIER));
      newStyles['--elh'] = `${eyeSquintFactor}`;
      newStyles['--erh'] = `${eyeSquintFactor}`;
      
      // Ear wiggle
      let midSum = 0;
      const midStartBin = Math.floor(bufferLength * AI_BOT_MID_BINS_START_PERCENTAGE);
      const midEndBin = Math.floor(bufferLength * AI_BOT_MID_BINS_END_PERCENTAGE);
      let midBinsCount = 0;
      for (let i = midStartBin; i < midEndBin; i++) {
          midSum += dataArray[i];
          midBinsCount++;
      }
      const averageMid = (midBinsCount > 0 ? midSum / midBinsCount / 255 : 0);
      const earReact = averageMid * AI_BOT_EAR_WIGGLE_MID_MULTIPLIER * Math.min(1, averageVolume * AI_BOT_EAR_WIGGLE_VOL_MULTIPLIER);
      
      if (Date.now() % AI_BOT_EAR_WIGGLE_INTERVAL_MS < AI_BOT_EAR_WIGGLE_INTERVAL_HALF_MS) {
          newStyles['--ealw'] = `${Math.max(AI_BOT_EAR_WIGGLE_MIN_SCALE, AI_BOT_EAR_WIGGLE_BASE_SCALE + earReact)}`;
          newStyles['--earw'] = `${Math.max(AI_BOT_EAR_WIGGLE_MIN_SCALE, AI_BOT_EAR_WIGGLE_BASE_SCALE + AI_BOT_EAR_WIGGLE_ALT_OFFSET - earReact * AI_BOT_EAR_WIGGLE_ALT_REDUCTION_FACTOR)}`;
      } else {
          newStyles['--ealw'] = `${Math.max(AI_BOT_EAR_WIGGLE_MIN_SCALE, AI_BOT_EAR_WIGGLE_BASE_SCALE + AI_BOT_EAR_WIGGLE_ALT_OFFSET - earReact * AI_BOT_EAR_WIGGLE_ALT_REDUCTION_FACTOR)}`;
          newStyles['--earw'] = `${Math.max(AI_BOT_EAR_WIGGLE_MIN_SCALE, AI_BOT_EAR_WIGGLE_BASE_SCALE + earReact)}`;
      }
      
      setBotStyles(newStyles);
      if (animationFrameIdRef.current !== null) animationFrameIdRef.current = requestAnimationFrame(visualize);
    };

    // Start the animation loop if not already started.
    if (animationFrameIdRef.current === null) {
      animationFrameIdRef.current = requestAnimationFrame(visualize);
    }

    // Cleanup function for the effect.
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null; // Mark as stopped
      }
      // Disconnect the analyser from the sourceNode to free up resources.
      // This is important to prevent memory leaks or continued processing.
      if (sourceNode && localAnalyserNode) {
        try {
          // Check if sourceNode is still connected to this specific analyser instance before disconnecting.
          // This check is a bit complex as Web Audio API doesn't offer a direct "isConnectedTo(node)" method.
          // A common practice is to just try disconnecting. If it wasn't connected, it might throw an error or do nothing.
          sourceNode.disconnect(localAnalyserNode);
        } catch (e) {
          // console.warn("useAIBotVisualization: Minor error disconnecting analyser on cleanup. This might happen if already disconnected or sourceNode changed.", e);
        }
      }
      // analyserRef.current = null; // Optional: Explicitly nullify the ref if desired for GC hinting.
      
      // Ensure styles are reset on unmount or when dependencies change causing effect cleanup.
      applyGlobalBotStyles({ ...INITIAL_BOT_STYLES });
      currentBotStylesRef.current = { ...INITIAL_BOT_STYLES };
    };
  }, [audioContext, sourceNode, isAssistantSpeaking, setBotStyles]);
  // Note: This hook does not return styles for the component to apply.
  // It manages the side effect of applying styles to document.documentElement directly.
};

export default useAIBotVisualization;
