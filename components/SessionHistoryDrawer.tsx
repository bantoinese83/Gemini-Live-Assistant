import React from 'react';
import HoverVideoPlayer from 'react-hover-video-player';
import type { SupabaseSession } from '../types';

interface SessionHistoryDrawerProps {
  open: boolean;
  sessions: SupabaseSession[];
  loading: boolean;
  error: string | null;
  videoThumbnails: { [sessionId: string]: string };
  thumbnailLoading: { [sessionId: string]: boolean };
  onSessionClick: (session: SupabaseSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
  hasMoreSessions: boolean;
  isFetchingMore?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const SessionHistoryDrawer: React.FC<SessionHistoryDrawerProps> = ({
  open,
  sessions,
  loading,
  error,
  videoThumbnails,
  thumbnailLoading,
  onSessionClick,
  onDeleteSession,
  onClose,
  hasMoreSessions,
  isFetchingMore = false,
  scrollContainerRef,
}) => {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/40 transition-opacity" aria-hidden="true" onClick={onClose} />
      {/* Drawer panel */}
      <aside
        className="relative h-full w-full sm:w-[28rem] md:w-[32rem] max-w-full bg-[var(--color-background-secondary)] rounded-l-2xl shadow-2xl border-l border-[var(--color-border-primary)] flex flex-col animate-slide-in-right focus:outline-none"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ right: 0, top: 0, position: 'fixed' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-2xl font-bold">Session History</h2>
          <button onClick={onClose} className="text-3xl font-bold px-3 py-1 rounded hover:bg-[var(--color-background-tertiary)] focus:outline-none" aria-label="Close session history">×</button>
        </div>
        <div ref={scrollContainerRef} className="flex-1 p-6 overflow-y-auto min-h-0">
          {loading && <div className="text-center text-[var(--color-text-muted)] py-8">Loading...</div>}
          {error && <div className="text-red-400 text-center py-8">{error}</div>}
          {!loading && !error && sessions.length === 0 && (
            <div className="text-center text-[var(--color-text-muted)] py-16 text-lg">No sessions found.<br/>Your session history will appear here.</div>
          )}
          <ul className="grid grid-cols-1 gap-6 pr-2">
            {sessions.map(session => (
              <li
                key={session.id}
                className="relative group bg-gradient-to-br from-[var(--color-background-tertiary)] to-[var(--color-background-secondary)] rounded-2xl p-4 shadow-lg border border-[var(--color-border-primary)] transition-all duration-200 hover:scale-[1.025] hover:shadow-2xl hover:border-accent-400 cursor-pointer overflow-hidden"
                onClick={() => onSessionClick(session)}
              >
                {/* Animated border effect */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-accent-400 group-hover:shadow-[0_0_24px_2px_var(--color-accent-sky)] transition-all duration-300" />
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-accent-400 text-base drop-shadow">{session.persona}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(session.started_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-20 h-12 flex items-center justify-center rounded-lg overflow-hidden bg-slate-800">
                    {session.video_url ? (
                      thumbnailLoading[session.id] ? (
                        <div className="w-full h-full bg-slate-700 rounded-lg animate-pulse" />
                      ) : videoThumbnails[session.id] ? (
                        <HoverVideoPlayer
                          className="session-history-thumbnail shadow-md rounded-lg"
                          videoSrc={videoThumbnails[session.id]}
                          loadingOverlay={
                            <div className="bg-slate-700 rounded-lg animate-pulse w-full h-full" />
                          }
                          loop
                          muted
                          preload="metadata"
                          style={{ width: '100%', height: '100%', borderRadius: '0.5rem', objectFit: 'cover', marginTop: 0 }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Video</div>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Video</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 ml-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">Session ID: {session.id.slice(0, 8)}...</span>
                    <span className="text-xs text-[var(--color-text-muted)] truncate">Started: {new Date(session.started_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/50 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); onDeleteSession(session.id); }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {isFetchingMore && (
              <li className="text-center text-[var(--color-text-muted)] py-2">Loading more...</li>
            )}
          </ul>
          {/* Optionally, add a 'Load more' button if hasMoreSessions is true */}
          {hasMoreSessions && !loading && (
            <div className="text-center mt-6 text-xs text-[var(--color-text-muted)]">Scroll to load more...</div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default SessionHistoryDrawer; 