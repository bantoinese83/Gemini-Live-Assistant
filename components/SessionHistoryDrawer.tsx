import React, { useState, useRef, useEffect } from 'react';
import HoverVideoPlayer from 'react-hover-video-player';
import type { SupabaseSession } from '../types';
import { Trash2, Volume2, MessageSquare, Download } from 'lucide-react';

interface SessionHistoryDrawerProps {
  open: boolean;
  sessions: SupabaseSession[];
  loading: boolean;
  error: string | null;
  videoThumbnails: { [sessionId: string]: string };
  thumbnailLoading: { [sessionId: string]: boolean };
  onSessionClick: (session: SupabaseSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDownloadSession?: (session: SupabaseSession) => void;
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
  onDownloadSession,
  onClose,
  hasMoreSessions,
  isFetchingMore = false,
  scrollContainerRef,
}) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const lastScroll = useRef<number>(0);
  // Batch select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

  // Persistent scroll position
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = lastScroll.current;
    }
  }, [open, scrollContainerRef]);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handle = () => { lastScroll.current = container.scrollTop; };
    container.addEventListener('scroll', handle);
    return () => container.removeEventListener('scroll', handle);
  }, [scrollContainerRef]);

  // Analytics summary
  const totalSessions = sessions.length;
  const lastSessionDate = sessions[0]?.started_at ? new Date(sessions[0].started_at).toLocaleDateString() : null;

  // Keyboard accessibility for delete/confirm/cancel
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  // Select mode helpers
  const allSelected = selectedIds.length === sessions.length && sessions.length > 0;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(sessions.map(s => s.id));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
    setPendingBatchDelete(false);
    setBatchDeleteError(null);
  };

  // Batch delete handler
  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    setBatchDeleteError(null);
    try {
      for (const id of selectedIds) {
        await onDeleteSession(id);
      }
      exitSelectMode();
    } catch (err: any) {
      setBatchDeleteError(err.message || 'Failed to delete selected sessions');
    } finally {
      setBatchDeleting(false);
    }
  };

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
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  className="px-3 py-1 rounded bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 focus:outline-none"
                  onClick={exitSelectMode}
                  aria-label="Cancel select mode"
                >Cancel</button>
                <button
                  className="px-3 py-1 rounded bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 focus:outline-none"
                  onClick={toggleSelectAll}
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >{allSelected ? 'Deselect All' : 'Select All'}</button>
              </>
            ) : (
              <button
                className="px-3 py-1 rounded bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 focus:outline-none"
                onClick={() => setSelectMode(true)}
                aria-label="Select sessions for batch delete"
              >Select</button>
            )}
            <button onClick={onClose} className="text-3xl font-bold px-3 py-1 rounded hover:bg-[var(--color-background-tertiary)] focus:outline-none" aria-label="Close session history">×</button>
          </div>
        </div>
        <div className="px-6 pt-3 pb-1 border-b border-[var(--color-border-primary)] flex items-center gap-6 text-xs text-[var(--color-text-muted)]">
          <span>Total sessions: <span className="font-semibold text-accent-400">{totalSessions}</span></span>
          {lastSessionDate && <span>Last session: <span className="font-semibold">{lastSessionDate}</span></span>}
        </div>
        {selectMode && (
          <div className="px-6 py-2 border-b border-[var(--color-border-primary)] flex items-center gap-4 bg-slate-800/60">
            <span className="text-sm">{selectedIds.length} selected</span>
            <button
              className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 focus:outline-none"
              onClick={() => setPendingBatchDelete(true)}
              disabled={selectedIds.length === 0 || batchDeleting}
              aria-label="Delete selected sessions"
            >Delete Selected</button>
            {batchDeleteError && <span className="text-xs text-red-400 ml-2">{batchDeleteError}</span>}
          </div>
        )}
        {selectMode && pendingBatchDelete && (
          <div className="px-6 py-2 border-b border-[var(--color-border-primary)] flex items-center gap-4 bg-red-900/80">
            <span className="text-white text-sm font-semibold">Delete {selectedIds.length} sessions?</span>
            <button
              className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 focus:outline-none"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              aria-label="Confirm batch delete"
            >{batchDeleting ? <svg className="animate-spin h-4 w-4 mx-2 inline" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Yes'}</button>
            <button
              className="px-3 py-1 rounded bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 focus:outline-none"
              onClick={() => setPendingBatchDelete(false)}
              disabled={batchDeleting}
              aria-label="Cancel batch delete"
            >No</button>
          </div>
        )}
        <div ref={scrollContainerRef} className="flex-1 p-6 overflow-y-auto min-h-0">
          {loading && <div className="text-center text-[var(--color-text-muted)] py-8">Loading...</div>}
          {error && <div className="text-red-400 text-center py-8">{error}</div>}
          {!loading && !error && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-lg text-[var(--color-text-muted)]">
              <svg width="80" height="80" fill="none" viewBox="0 0 80 80" className="mb-4">
                <circle cx="40" cy="40" r="36" stroke="#38bdf8" strokeWidth="4" fill="#f1f5f9" />
                <rect x="24" y="32" width="32" height="24" rx="6" fill="#bae6fd" />
                <rect x="30" y="38" width="20" height="4" rx="2" fill="#38bdf8" />
                <rect x="30" y="46" width="12" height="4" rx="2" fill="#38bdf8" />
              </svg>
              <span>No sessions found.<br/>Your session history will appear here.</span>
            </div>
          )}
          <ul className="grid grid-cols-1 gap-6 pr-2">
            {sessions.map(session => (
              <li
                key={session.id}
                className={`relative group bg-gradient-to-br from-[var(--color-background-tertiary)] to-[var(--color-background-secondary)] rounded-2xl p-4 shadow-lg border border-[var(--color-border-primary)] transition-all duration-200 hover:scale-[1.035] hover:shadow-2xl hover:border-accent-400 cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-accent-400 hover:bg-[var(--color-background-tertiary-light)]`}
                onClick={() => !selectMode && onSessionClick(session)}
                tabIndex={0}
                onKeyDown={e => handleKeyDown(e, () => !selectMode && onSessionClick(session))}
                aria-label={`Session ${session.id}`}
              >
                {/* Checkbox for select mode */}
                {selectMode && (
                  <input
                    type="checkbox"
                    className="mr-3 accent-sky-500 scale-125 align-middle"
                    checked={selectedIds.includes(session.id)}
                    onChange={() => toggleSelect(session.id)}
                    onClick={e => e.stopPropagation()}
                    tabIndex={0}
                    aria-label={selectedIds.includes(session.id) ? 'Deselect session' : 'Select session'}
                  />
                )}
                {/* Animated border effect */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-accent-400 group-hover:shadow-[0_0_24px_2px_var(--color-accent-sky)] transition-all duration-300" />
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-accent-400 text-base drop-shadow" title={session.personaDescription || session.persona}> {/* Tooltip */}
                    <span tabIndex={0} aria-label={`Persona: ${session.persona}`}>{session.persona}</span>
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]" title={new Date(session.started_at).toLocaleString()}>{new Date(session.started_at).toLocaleString()}</span>
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
                    ) : session.audio_url ? (
                      <div className="w-full h-full flex items-center justify-center text-accent-400">
                        <Volume2 size={28} />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Media</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 ml-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate" title={session.id} tabIndex={0} aria-label={`Session ID: ${session.id}`}>Session ID: {session.id.slice(0, 8)}...</span>
                    <span className="text-xs text-[var(--color-text-muted)] truncate">Started: {new Date(session.started_at).toLocaleDateString()}</span>
                    {/* Preview snippet of transcript or first message */}
                    {session.previewSnippet ? (
                      <span className="text-xs text-slate-500 italic truncate flex items-center gap-1" title={session.previewSnippet}>
                        <MessageSquare size={14} className="text-slate-400 mr-1" />
                        {session.previewSnippet}
                      </span>
                    ) : session.transcripts && session.transcripts.length > 0 ? (
                      <span className="text-xs text-slate-400 italic truncate flex items-center gap-1" title={session.transcripts[0].text}>
                        <MessageSquare size={14} className="text-slate-300 mr-1" />
                        {session.transcripts[0].text.split(' ').slice(0, 12).join(' ')}{session.transcripts[0].text.split(' ').length > 12 ? '…' : ''}
                      </span>
                    ) : null}
                  </div>
                  {!selectMode && (pendingDeleteId === session.id ? (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-red-500 font-semibold">Delete?</span>
                      <button
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 focus:outline-none"
                        onClick={e => { e.stopPropagation(); setDeletingId(session.id); setDeleteError(null); onDeleteSession(session.id).catch(err => setDeleteError(err.message || 'Failed to delete')); setPendingDeleteId(null); }}
                        onKeyDown={e => handleKeyDown(e, () => { setDeletingId(session.id); setDeleteError(null); onDeleteSession(session.id).catch(err => setDeleteError(err.message || 'Failed to delete')); setPendingDeleteId(null); })}
                        disabled={deletingId === session.id}
                        aria-label="Confirm delete session"
                      >
                        {deletingId === session.id ? (
                          <svg className="animate-spin h-4 w-4 mx-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'Yes'}
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 focus:outline-none"
                        onClick={e => { e.stopPropagation(); setPendingDeleteId(null); setDeleteError(null); }}
                        onKeyDown={e => handleKeyDown(e, () => { setPendingDeleteId(null); setDeleteError(null); })}
                        aria-label="Cancel delete session"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onDownloadSession && (
                        <button
                          className="p-2 rounded-lg bg-[var(--color-accent-blue)] text-white text-xs font-semibold shadow hover:bg-[var(--color-accent-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/50"
                          onClick={e => { e.stopPropagation(); onDownloadSession(session); }}
                          onKeyDown={e => handleKeyDown(e, () => { onDownloadSession(session); })}
                          aria-label="Download session"
                          title="Download session"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button
                        className="p-2 rounded-lg bg-red-500 text-white text-xs font-semibold shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                        onClick={e => { e.stopPropagation(); setPendingDeleteId(session.id); setDeleteError(null); }}
                        onKeyDown={e => handleKeyDown(e, () => { setPendingDeleteId(session.id); setDeleteError(null); })}
                        aria-label="Delete session"
                        title="Delete session"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {deleteError && pendingDeleteId === session.id && (
                  <div className="text-xs text-red-400 mt-2">{deleteError}</div>
                )}
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