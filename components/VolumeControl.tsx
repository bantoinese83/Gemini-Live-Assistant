
import React, { useState, useEffect, useCallback } from 'react';
import { TRANSITION_FAST, FOCUS_RING_BASE, FOCUS_RING_OFFSET_LIGHT } from '../theme';

/**
 * Props for the VolumeControl component.
 */
interface VolumeControlProps {
  /** A descriptive label for the volume control (e.g., "Input (Mic)", "Output (AI Voice)"). */
  label: string;
  /** The `GainNode` whose gain (volume) this slider will control. Null if not available. */
  gainNode: GainNode | null;
  /** Initial volume level, ranging from 0 (muted) to 1.5 (150%). Defaults to 0.7 (70%). */
  initialVolume?: number;
}

/**
 * A reusable slider component for controlling the volume of an audio `GainNode`.
 * Displays the current volume as a percentage.
 */
const VolumeControl: React.FC<VolumeControlProps> = React.memo(({ label, gainNode, initialVolume = 0.7 }) => {
  // Local state for the slider's current volume value.
  const [volume, setVolume] = useState(initialVolume);

  // Effect to update the GainNode's actual gain value when `volume` state or `gainNode` prop changes.
  useEffect(() => {
    if (gainNode) {
      // Clamp gain value to a safe range (e.g., 0 to 2, or 200%).
      // The slider itself is limited to 1.5 (150%).
      gainNode.gain.value = Math.max(0, Math.min(2, volume));
    }
  }, [volume, gainNode]); // Re-run if volume or gainNode instance changes.

  /** Handles changes from the range input slider. */
  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value));
  },[]); // No dependencies, as setVolume is stable.

  // Style for the slider track and thumb using CSS variable for accent color.
  // This allows the slider's active color to be themed globally.
  const sliderStyle = {
    accentColor: 'var(--color-accent-teal)',
  };

  const sliderId = `${label.toLowerCase().replace(/\s+/g, '-')}-volume`;

  return (
    <div className="mb-3 px-1">
      <label htmlFor={sliderId} className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        {label} Volume: {Math.round(volume * 100)}%
      </label>
      <input
        id={sliderId}
        type="range"
        min="0"    // Minimum volume (muted)
        max="1.5"  // Maximum volume (150% gain, can be adjusted)
        step="0.01"// Step increment for fine control
        value={volume}
        onChange={handleVolumeChange}
        disabled={!gainNode} // Disable slider if no GainNode is provided
        className={`w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_BASE} ${FOCUS_RING_OFFSET_LIGHT} focus:ring-[var(--color-accent-teal)] ${TRANSITION_FAST}`}
        style={sliderStyle}
        aria-label={`${label} Volume Control`}
        aria-valuemin={0}
        aria-valuemax={1.5}
        aria-valuenow={volume}
        aria-valuetext={`${Math.round(volume * 100)}%`}
      />
    </div>
  );
});

export default VolumeControl;
