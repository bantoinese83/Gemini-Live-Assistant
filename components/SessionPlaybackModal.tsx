import React from 'react';
import type { SupabaseSession, SupabaseTranscript } from '../types';

interface SessionPlaybackModalProps {
  open: boolean;
  session: SupabaseSession | null;
  transcripts: SupabaseTranscript[];
  videoUrl: string | null;
  onClose: () => void;
}

const SessionPlaybackModal: React.FC<SessionPlaybackModalProps> = ({
  open,
  session,
  transcripts,
  videoUrl,
  onClose,
}) => {
  if (!open || !session) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl p-6 max-w-2xl w-full relative flex flex-col gap-4">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-xl font-bold">&times;</button>
        <h3 className="text-lg font-bold mb-2">Session Playback</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            {videoUrl ? (
              <video src={videoUrl} controls className="rounded-lg shadow-lg w-full max-w-md aspect-video bg-black" />
            ) : (
              <div className="w-full max-w-md aspect-video flex items-center justify-center bg-slate-800 rounded-lg text-slate-400 text-xs">No Video</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-72 bg-slate-900 rounded-lg p-3 shadow-inner">
            <h4 className="font-semibold text-slate-200 mb-2 text-sm">Transcript</h4>
            {transcripts.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {transcripts.map((t, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className={`font-bold ${t.speaker === 'user' ? 'text-green-400' : 'text-blue-400'}`}>{t.speaker === 'user' ? 'You:' : 'AI:'}</span>
                    <span className="text-slate-100">{t.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-400 text-xs">No transcript available.</div>
            )}
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600">Close</button>
        </div>
      </div>
    </div>
  );
};

export default SessionPlaybackModal; 