import React, { useRef, useState, useEffect } from "react";
import type { SupabaseSession, SupabaseTranscript } from "../types";

interface SessionPlaybackModalProps {
  open: boolean;
  session: SupabaseSession | null;
  transcripts: SupabaseTranscript[];
  videoUrl: string | null;
  onClose: () => void;
}

const isWebmAudioOnly = async (url: string): Promise<boolean> => {
  // Try to detect if the webm file is audio-only by loading metadata
  return new Promise((resolve) => {
    const testVideo = document.createElement("video");
    testVideo.src = url;
    testVideo.preload = "metadata";
    testVideo.onloadedmetadata = () => {
      // If videoWidth/Height are 0, it's likely audio-only
      resolve(testVideo.videoWidth === 0 && testVideo.videoHeight === 0);
    };
    testVideo.onerror = () => resolve(false); // fallback: treat as video
  });
};

const CustomAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", () => setIsPlaying(false));
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", () => setIsPlaying(false));
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (t: number) => {
    if (!isFinite(t) || isNaN(t) || t < 0) {
      return "0:00";
    }
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center bg-slate-900 rounded-lg p-4 shadow-lg">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex items-center w-full gap-3">
        <button
          onClick={handlePlayPause}
          className={`rounded-full p-2 bg-[var(--color-accent-teal)] text-white shadow-md hover:bg-[var(--color-accent-teal-dark)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500/70`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <rect
                x="6"
                y="5"
                width="4"
                height="14"
                rx="2"
                fill="currentColor"
              />
              <rect
                x="14"
                y="5"
                width="4"
                height="14"
                rx="2"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M7 5v14l11-7L7 5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={progress}
          onChange={handleSeek}
          className="flex-1 accent-[var(--color-accent-teal)] h-2 rounded-lg bg-slate-700"
        />
        <span className="text-xs text-slate-300 w-12 text-right">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

const SessionPlaybackModal: React.FC<SessionPlaybackModalProps> = ({
  open,
  session,
  transcripts,
  videoUrl,
  onClose,
}) => {
  const [audioOnly, setAudioOnly] = useState(false);
  useEffect(() => {
    let active = true;
    if (videoUrl) {
      isWebmAudioOnly(videoUrl).then((isAudio) => {
        if (active) {
          setAudioOnly(isAudio);
        }
      });
    } else {
      setAudioOnly(false);
    }
    return () => {
      active = false;
    };
  }, [videoUrl]);

  if (!open || !session) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl p-6 max-w-2xl w-full relative flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-xl font-bold"
        >
          &times;
        </button>
        <h3 className="text-lg font-bold mb-2">Session Playback</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            {videoUrl ? (
              audioOnly ? (
                <CustomAudioPlayer src={videoUrl} />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  className="rounded-lg shadow-lg w-full max-w-md aspect-video bg-black"
                />
              )
            ) : (
              <div className="w-full max-w-md aspect-video flex items-center justify-center bg-slate-800 rounded-lg text-slate-400 text-xs">
                No Video
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-72 bg-slate-900 rounded-lg p-3 shadow-inner">
            <h4 className="font-semibold text-slate-200 mb-2 text-sm">
              Transcript
            </h4>
            {transcripts.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {transcripts.map((t, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span
                      className={`font-bold ${t.speaker === "user" ? "text-green-400" : "text-blue-400"}`}
                    >
                      {t.speaker === "user" ? "You:" : "AI:"}
                    </span>
                    <span className="text-slate-100">{t.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-400 text-xs">
                No transcript available.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionPlaybackModal;
