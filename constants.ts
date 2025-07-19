
// Transcript update throttling
export const USER_TRANSCRIPT_THROTTLE_MS = 250; // Slightly faster for responsiveness
export const MODEL_TRANSCRIPT_THROTTLE_MS = 250;

// Video capture settings
export const VIDEO_FRAME_RATE = 10; // Frames per second
export const VIDEO_QUALITY = 0.7; // JPEG quality (0.0 to 1.0)

// AI Assistant
export const DEFAULT_SYSTEM_INSTRUCTION = "You are a friendly and helpful AI assistant. Keep your responses concise and engaging.";
export const AI_SPEAKING_RESET_DELAY_MS = 300; // Delay before AI bot resets after speaking stops

// API and Connection
export const MAX_RECONNECT_ATTEMPTS = 5;
export const RECONNECT_DELAY_BASE_MS = 1000;

// UI Behavior
export const TRANSCRIPT_SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';

// Performance optimizations
export const DEBOUNCE_DELAY_MS = 150; // For search and filter operations
export const THROTTLE_DELAY_MS = 100; // For scroll and resize events
export const ANIMATION_DURATION_MS = 200; // Standard animation duration
export const HOVER_DELAY_MS = 300; // Delay before showing tooltips

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  START_RECORDING: 'Space',
  STOP_RECORDING: 'Space',
  RESET_SESSION: 'Escape',
  TOGGLE_VIDEO: 'V',
  TOGGLE_SCREEN_SHARE: 'S',
  MUTE_AUDIO: 'M',
  SHOW_HISTORY: 'H',
  SHOW_ANALYTICS: 'A',
  COPY_TRANSCRIPT: 'C',
  SCROLL_TO_BOTTOM: 'End',
} as const;

// Accessibility
export const FOCUS_MANAGEMENT = {
  FOCUS_RING_COLOR: 'var(--color-accent-blue)',
  FOCUS_RING_WIDTH: '2px',
  FOCUS_RING_OFFSET: '2px',
} as const;

// AI Bot Visualization Parameters
export const AI_BOT_ANALYSER_FFT_SIZE = 256;
export const AI_BOT_ANALYSER_SMOOTHING_TIME = 0.35;

// --- Animation Sensitivity ---
// Mouth
export const AI_BOT_MOUTH_HEIGHT_MIN = 0.1;
export const AI_BOT_MOUTH_HEIGHT_BASE = 0.1;
export const AI_BOT_MOUTH_HEIGHT_VOL_MULTIPLIER = 4.5;
export const AI_BOT_MOUTH_WIDTH_MIN = 0.2;
export const AI_BOT_MOUTH_WIDTH_BASE = 0.3;
export const AI_BOT_MOUTH_WIDTH_VOL_MULTIPLIER = 3.0;

// Head/Face
export const AI_BOT_HEAD_TILT_BASS_THRESHOLD = 0.03; // Average bass value above which tilt starts
export const AI_BOT_HEAD_TILT_FACTOR_MULTIPLIER = 45;
export const AI_BOT_HEAD_TILT_VOL_MULTIPLIER = 2.0; // How much overall volume affects tilt
export const AI_BOT_BASS_BINS_PERCENTAGE = 0.22; // Percentage of FFT bins considered 'bass'

// Eyes
export const AI_BOT_EYE_SQUINT_MIN = 0.03;
export const AI_BOT_EYE_SQUINT_BASE = 1.0;
export const AI_BOT_EYE_SQUINT_TREBLE_MULTIPLIER = 2.0;
export const AI_BOT_EYE_SQUINT_VOL_MULTIPLIER = 1.8;
export const AI_BOT_TREBLE_BINS_START_PERCENTAGE = 0.60; // Percentage of FFT bins where 'treble' starts

// Ears
export const AI_BOT_EAR_WIGGLE_MIN_SCALE = 0.03;
export const AI_BOT_EAR_WIGGLE_BASE_SCALE = 0.5;
export const AI_BOT_EAR_WIGGLE_MID_MULTIPLIER = 1.8;
export const AI_BOT_EAR_WIGGLE_VOL_MULTIPLIER = 1.8;
export const AI_BOT_EAR_WIGGLE_ALT_OFFSET = 0.05; // Base offset for alternating ear scale
export const AI_BOT_EAR_WIGGLE_ALT_REDUCTION_FACTOR = 0.7; // How much the other ear reduces
export const AI_BOT_MID_BINS_START_PERCENTAGE = 0.23;
export const AI_BOT_MID_BINS_END_PERCENTAGE = 0.58;
export const AI_BOT_EAR_WIGGLE_INTERVAL_MS = 200; // Interval for alternating wiggle
export const AI_BOT_EAR_WIGGLE_INTERVAL_HALF_MS = AI_BOT_EAR_WIGGLE_INTERVAL_MS / 2;

// Error handling
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection lost. Please check your internet connection.',
  API_ERROR: 'Unable to connect to AI service. Please try again.',
  PERMISSION_ERROR: 'Camera or microphone access denied. Please check your browser permissions.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please refresh the page and try again.',
} as const;

// Status messages
export const STATUS_MESSAGES = {
  CONNECTING: 'Connecting to AI service...',
  CONNECTED: 'Connected and ready',
  RECORDING: 'Recording in progress...',
  PROCESSING: 'Processing your request...',
  SAVING: 'Saving session...',
  SAVED: 'Session saved successfully',
  ERROR: 'An error occurred',
} as const;
