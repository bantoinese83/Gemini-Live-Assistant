import React, { useRef, useState, useEffect } from "react";
import type { SupabaseSession, SupabaseTranscript } from "../types";
import LoadingSpinner from './LoadingSpinner';
import type { SessionAnalysisResult } from '../types';
import { RotateCcw } from 'lucide-react';

interface SessionPlaybackModalProps {
  open: boolean;
  session: SupabaseSession | null;
  transcripts: SupabaseTranscript[];
  videoUrl: string | null;
  audioUrl?: string | null;
  onClose: () => void;
  sessionAnalysis?: SessionAnalysisResult | null;
  analysisLoading?: boolean;
  onReanalyze?: () => void;
}

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
      audio.play().catch((err) => {
        if (err.name !== "AbortError") {
          // Optionally log or handle other errors
          console.warn("Audio play error:", err);
        }
      });
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
      <audio ref={audioRef} preload="metadata" className="hidden" controls>
        <source src={src} type="audio/webm" />
        Your browser does not support the audio element.
      </audio>
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
  audioUrl,
  onClose,
  sessionAnalysis,
  analysisLoading = false,
  onReanalyze,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    lastActiveElement.current = document.activeElement as HTMLElement;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && focusable && focusable.length > 0) {
        if (e.shiftKey) {
                  if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                  }
                }
        else if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                  }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    first?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastActiveElement.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !session) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        aria-label="Session Playback Modal"
        className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl max-w-2xl w-full relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto p-4 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h3 className="text-lg font-bold mb-2">Session Playback</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            {audioUrl ? (
              <CustomAudioPlayer src={audioUrl} />
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="rounded-lg shadow-lg w-full max-w-md aspect-video bg-black"
              />
            ) : (
              <div className="w-full max-w-md aspect-video flex items-center justify-center bg-slate-800 rounded-lg text-slate-400 text-xs">
                No Media
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
        <div className="mt-2 bg-slate-800 rounded-xl p-4 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-accent-400 text-base flex items-center gap-2">
              <span role="img" aria-label="Insights">💡</span> Session Analysis & Insights
            </h4>
            {onReanalyze && (
              <button
                className="ml-2 p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-500/70"
                onClick={onReanalyze}
                disabled={analysisLoading}
                aria-label="Re-analyze session with Gemini"
                title="Re-analyze session with Gemini"
              >
                {analysisLoading ? (
                  <LoadingSpinner size={18} />
                ) : (
                  <RotateCcw size={20} />
                )}
              </button>
            )}
          </div>
          {analysisLoading ? (
            <div className="flex items-center gap-2 text-slate-300"><LoadingSpinner /> Analyzing session...</div>
          ) : sessionAnalysis ? (
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-slate-200">Summary:</span>
                <div className="text-slate-100 mt-1 text-sm">{sessionAnalysis.summary}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-200">Key Metrics:</span>
                <ul className="text-slate-100 mt-1 text-sm ml-4 list-disc">
                  <li>Duration: {sessionAnalysis.keyMetrics.duration}s</li>
                  <li>User Turns: {sessionAnalysis.keyMetrics.userTurns}</li>
                  <li>AI Turns: {sessionAnalysis.keyMetrics.aiTurns}</li>
                  {sessionAnalysis.keyMetrics.sentiment && <li>Sentiment: {sessionAnalysis.keyMetrics.sentiment}</li>}
                </ul>
              </div>
              {sessionAnalysis.insights && sessionAnalysis.insights.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-200">Insights:</span>
                  <ul className="text-slate-100 mt-1 text-sm ml-4 list-disc">
                    {sessionAnalysis.insights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sessionAnalysis.quiz && sessionAnalysis.quiz.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-200">Quiz:</span>
                  <ul className="text-slate-100 mt-1 text-sm ml-4 list-decimal">
                    {sessionAnalysis.quiz.map((q, idx) => (
                      <li key={idx}><span className="font-semibold">Q:</span> {q.question} <br /><span className="font-semibold">A:</span> {q.answer}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(sessionAnalysis.visualHighlights && sessionAnalysis.visualHighlights.length > 0) && (
                <div>
                  <span className="font-semibold text-slate-200">Visual Highlights:</span>
                  <ul className="text-slate-100 mt-1 text-sm ml-4 list-disc">
                    {sessionAnalysis.visualHighlights.map((h, idx) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(sessionAnalysis.audioHighlights && sessionAnalysis.audioHighlights.length > 0) && (
                <div>
                  <span className="font-semibold text-slate-200">Audio Highlights:</span>
                  <ul className="text-slate-100 mt-1 text-sm ml-4 list-disc">
                    {sessionAnalysis.audioHighlights.map((h, idx) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs">No analysis available for this session.</div>
          )}
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
