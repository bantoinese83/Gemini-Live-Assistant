import { useEffect, useRef, useCallback, useState } from 'react';
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
import { perlinNoise1D } from '../utils/audioUtils';

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

const BLINK_MIN_INTERVAL = 2000; // ms
const BLINK_MAX_INTERVAL = 6000; // ms
const BLINK_DURATION = 120; // ms
const MICRO_MOVE_MIN_INTERVAL = 2000; // ms
const MICRO_MOVE_MAX_INTERVAL = 5000; // ms

const useAIBotVisualization = (
  audioContext: AudioContext | null,
  sourceNode: AudioNode | null,
  isAssistantSpeaking: boolean
): void => { // This hook is for side effects, does not return a value used for rendering.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const currentBotStylesRef = useRef<AIBotStyles>({ ...INITIAL_BOT_STYLES });
  const timeRef = useRef<number>(Date.now());
  const [emotion] = useState<'neutral' | 'happy' | 'curious'>('neutral');

  // Blink state and timer
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blinkEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  // Micro-movement state and timer
  const microMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [microHeadNod, setMicroHeadNod] = useState(0); // e.g., -1, 0, 1
  const [microEarWiggle, setMicroEarWiggle] = useState(0); // e.g., -1, 0, 1

  // Helper to schedule next blink
  const scheduleNextBlink = useCallback(() => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
    }
    const interval = BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
    blinkTimeoutRef.current = setTimeout(() => {
      setIsBlinking(true);
      if (blinkEndTimeoutRef.current) {
        clearTimeout(blinkEndTimeoutRef.current);
      }
      blinkEndTimeoutRef.current = setTimeout(() => {
        setIsBlinking(false);
        scheduleNextBlink();
      }, BLINK_DURATION);
    }, interval);
  }, []);

  // Helper to schedule next micro-movement
  const scheduleNextMicroMove = useCallback(() => {
    if (microMoveTimeoutRef.current) {
      clearTimeout(microMoveTimeoutRef.current);
    }
    const interval = MICRO_MOVE_MIN_INTERVAL + Math.random() * (MICRO_MOVE_MAX_INTERVAL - MICRO_MOVE_MIN_INTERVAL);
    microMoveTimeoutRef.current = setTimeout(() => {
      // Randomly pick -1, 0, or 1 for nod and wiggle
      setMicroHeadNod(Math.floor(Math.random() * 3) - 1);
      setMicroEarWiggle(Math.floor(Math.random() * 3) - 1);
      // Reset to 0 after a short time
      setTimeout(() => {
        setMicroHeadNod(0);
        setMicroEarWiggle(0);
      }, 400);
      scheduleNextMicroMove();
    }, interval);
  }, []);

  // Start/stop blink and micro-move timers based on speaking
  useEffect(() => {
    if (isAssistantSpeaking) {
      scheduleNextBlink();
      scheduleNextMicroMove();
    } else {
      setIsBlinking(false);
      setMicroHeadNod(0);
      setMicroEarWiggle(0);
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      if (blinkEndTimeoutRef.current) {
        clearTimeout(blinkEndTimeoutRef.current);
      }
      if (microMoveTimeoutRef.current) {
        clearTimeout(microMoveTimeoutRef.current);
      }
    }
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      if (blinkEndTimeoutRef.current) {
        clearTimeout(blinkEndTimeoutRef.current);
      }
      if (microMoveTimeoutRef.current) {
        clearTimeout(microMoveTimeoutRef.current);
      }
    };
  }, [isAssistantSpeaking, scheduleNextBlink, scheduleNextMicroMove]);

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

    // If the audioContext changes, reset the analyser
    if (analyserRef.current && analyserRef.current.context !== audioContext) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
      dataArrayRef.current = null;
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
        if (animationFrameIdRef.current !== null) {
          animationFrameIdRef.current = requestAnimationFrame(visualize);
        }
        return;
      }

      if (!isAssistantSpeaking) {
        // If assistant is not speaking, reset to initial styles.
        // Compare with current styles to avoid redundant DOM manipulation.
        if (JSON.stringify(currentBotStylesRef.current) !== JSON.stringify(INITIAL_BOT_STYLES)) {
            setBotStyles({ ...INITIAL_BOT_STYLES });
        }
        if (animationFrameIdRef.current !== null) {
          animationFrameIdRef.current = requestAnimationFrame(visualize);
        }
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
      
      // --- PERLIN NOISE SMOOTH JITTER ---
      const now = Date.now();
      const t = (now - timeRef.current) / 1000; // seconds since mount
      // Use different seeds for each property
      const noiseHead = perlinNoise1D(t * 0.5 + 10) * (emotion === 'curious' ? 2.5 : 1.5);
      const noiseMouth = perlinNoise1D(t * 0.7 + 20) * (emotion === 'happy' ? 0.18 : 0.12);
      const noiseEar = perlinNoise1D(t * 0.9 + 30) * 0.18;
      const noiseEye = perlinNoise1D(t * 0.6 + 40) * 0.08;

      // --- BLINK ---
      let elh = eyeSquintFactor + noiseEye;
      let erh = eyeSquintFactor + noiseEye;
      if (isBlinking) {
        elh = 0.2;
        erh = 0.2;
      }

      // --- MICRO-MOVEMENTS ---
      // Head nod: add to head tilt
      let headTilt = headTiltFactor + microHeadNod * 1.5 + noiseHead;
      // Ear wiggle: add to ear scale
      let ealw = parseFloat(newStyles['--ealw']) + microEarWiggle * 0.2 + noiseEar;
      let earw = parseFloat(newStyles['--earw']) + microEarWiggle * 0.2 + noiseEar;
      // Mouth: add noise
      let mh = parseFloat(newStyles['--mh']) + noiseMouth;
      let mw = parseFloat(newStyles['--mw']) + noiseMouth;

      // Clamp values to reasonable ranges
      elh = Math.max(0.15, Math.min(1.2, elh));
      erh = Math.max(0.15, Math.min(1.2, erh));
      mh = Math.max(AI_BOT_MOUTH_HEIGHT_MIN, Math.min(2.0, mh));
      mw = Math.max(AI_BOT_MOUTH_WIDTH_MIN, Math.min(2.0, mw));
      ealw = Math.max(0.7, Math.min(1.5, ealw));
      earw = Math.max(0.7, Math.min(1.5, earw));
      headTilt = Math.max(-5, Math.min(5, headTilt));

      // Apply to styles
      newStyles['--elh'] = `${elh}`;
      newStyles['--erh'] = `${erh}`;
      newStyles['--mh'] = `${mh}`;
      newStyles['--mw'] = `${mw}`;
      newStyles['--fx'] = `${headTilt}%`;
      newStyles['--erx'] = `${headTilt}%`;
      newStyles['--ealw'] = `${ealw}`;
      newStyles['--earw'] = `${earw}`;

      setBotStyles(newStyles);
      if (animationFrameIdRef.current !== null) {
        animationFrameIdRef.current = requestAnimationFrame(visualize);
      }
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
  }, [audioContext, sourceNode, isAssistantSpeaking, setBotStyles, isBlinking, microHeadNod, microEarWiggle, emotion]);
  // Note: This hook does not return styles for the component to apply.
  // It manages the side effect of applying styles to document.documentElement directly.
};

export default useAIBotVisualization;
