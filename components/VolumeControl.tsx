import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TRANSITION_FAST, FOCUS_RING_BASE, FOCUS_RING_OFFSET_LIGHT } from '../theme';
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';

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
  /** The AudioContext for this gain node, used for real-time metering. */
  audioContext?: AudioContext | null;
}

/**
 * A reusable slider component for controlling the volume of an audio `GainNode`.
 * Displays the current volume as a percentage and a real-time horizontal volume meter.
 */
const VolumeControl: React.FC<VolumeControlProps> = React.memo(({ label, gainNode, initialVolume = 0.7, audioContext }) => {
  // Local state for the slider's current volume value.
  const [volume, setVolume] = useState(initialVolume);
  // Real-time meter state (0-1)
  const [meter, setMeter] = useState(0);
  // Previous volume for mute/unmute functionality
  const [previousVolume, setPreviousVolume] = useState(initialVolume);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  // Effect to update the GainNode's actual gain value when `volume` state or `gainNode` prop changes.
  useEffect(() => {
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(2, volume));
    }
  }, [volume, gainNode]);

  // Real-time volume meter effect
  useEffect(() => {
    if (!audioContext || !gainNode) {
      setMeter(0);
      return;
    }
    // Create analyser if not exists
    if (!analyserRef.current) {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      try {
        gainNode.connect(analyser);
      } catch (e) {
        // Already connected
      }
    }
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    let running = true;
    const updateMeter = () => {
      if (!analyser || !dataArray || !running) {
        return;
      }
      analyser.getByteTimeDomainData(dataArray);
      // Compute RMS (root mean square) for perceived loudness
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setMeter(rms);
      rafRef.current = requestAnimationFrame(updateMeter);
    };
    rafRef.current = requestAnimationFrame(updateMeter);
    return () => {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (analyser && gainNode) {
        try { gainNode.disconnect(analyser); } catch (e) {}
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [audioContext, gainNode]);

  /** Handles changes from the range input slider. */
  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (newVolume > 0) {
      setPreviousVolume(newVolume);
    }
  },[]);

  /** Handles mute/unmute toggle. */
  const handleMuteToggle = useCallback(() => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  }, [volume, previousVolume]);

  /** Handles keyboard shortcuts. */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      handleMuteToggle();
    }
  }, [handleMuteToggle]);

  const sliderStyle = {
    accentColor: 'var(--color-accent-blue)',
  };

  const sliderId = `${label.toLowerCase().replace(/\s+/g, '-')}-volume`;

  // Meter bar styling
  const meterPercent = Math.round(meter * 100);
  const meterColor = meter > 0.7 ? '#ef4444' : meter > 0.4 ? '#f59e0b' : 'var(--color-accent-blue)';
  // Convert RMS to dB for tooltip (approximate)
  const meterDb = meter > 0 ? (20 * Math.log10(meter)).toFixed(1) : '-∞';

  // Volume icon based on level
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={16} />;
    if (volume < 0.3) return <Volume size={16} />;
    if (volume < 0.7) return <Volume1 size={16} />;
    return <Volume2 size={16} />;
  };

  return (
    <div 
      className="mb-3 px-3 py-4 rounded-lg bg-[var(--color-background-tertiary)] hover-lift transition-all duration-200 border border-[var(--color-border-primary)]/50"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={sliderId} className="block text-xs font-medium text-[var(--color-text-secondary)]">
          {label} Volume: {Math.round(volume * 100)}%
        </label>
        <button
          onClick={handleMuteToggle}
          className={`p-1 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] ${
            volume === 0 
              ? 'text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10' 
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10'
          }`}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          title={`${volume === 0 ? 'Unmute' : 'Mute'} (M)`}
        >
          {getVolumeIcon()}
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <input
          id={sliderId}
          type="range"
          min="0"
          max="1.5"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          disabled={!gainNode}
          className={`flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_BASE} ${FOCUS_RING_OFFSET_LIGHT} focus:ring-[var(--color-accent-blue)] ${TRANSITION_FAST} hover:bg-slate-500`}
          style={sliderStyle}
          aria-label={`${label} Volume Control`}
          aria-valuemin={0}
          aria-valuemax={1.5}
          aria-valuenow={volume}
          aria-valuetext={`${Math.round(volume * 100)}%`}
        />
        
        {audioContext && gainNode ? (
          <div
            className="relative flex items-center h-6 w-20 bg-slate-800 rounded-md overflow-hidden shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
            tabIndex={0}
            aria-live="polite"
            aria-label={`${label} real-time volume meter`}
            title={`Current level: ${meterPercent}% (${meterDb} dB)`}
          >
            <div
              className="absolute left-0 top-0 h-full transition-all duration-150"
              style={{
                width: `${meterPercent}%`,
                background: `linear-gradient(90deg, ${meterColor} 60%, #38bdf8 100%)`,
                boxShadow: '0 0 8px 0 #38bdf8cc',
                transition: 'width 0.15s cubic-bezier(.4,2,.6,1)',
              }}
            />
            <span className="relative z-10 w-full text-xs text-center text-slate-200 font-semibold select-none" style={{ textShadow: '0 1px 2px #0008' }}>
              {meterPercent}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic ml-2">No audio device</span>
        )}
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-[var(--color-text-muted)] text-center">
        Press <kbd className="px-1 py-0.5 bg-[var(--color-background-primary)] border border-[var(--color-border-primary)] rounded text-xs">M</kbd> to mute/unmute
      </div>
    </div>
  );
});

export default VolumeControl;
