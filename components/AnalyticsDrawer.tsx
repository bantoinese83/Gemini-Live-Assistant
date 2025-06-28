import React from 'react';

interface AnalyticsDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  analytics: any;
  onClose: () => void;
}

const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({ open, loading, error, analytics, onClose }) => {
  if (!open) return null;
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
          <h2 className="text-2xl font-bold">Session Analytics</h2>
          <button onClick={onClose} className="text-3xl font-bold px-3 py-1 rounded hover:bg-[var(--color-background-tertiary)] focus:outline-none" aria-label="Close analytics">×</button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          {loading ? (
            <div className="text-center text-[var(--color-text-muted)] py-8">Loading...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : analytics ? (
            <div className="space-y-4">
              <div><b>Total Sessions:</b> {analytics.totalSessions}</div>
              <div><b>Average Duration:</b> {analytics.avgDuration.toFixed(1)}s</div>
              <div><b>Most Common Sentiment:</b> {analytics.mostCommonSentiment}</div>
              <div><b>Top Insights:</b>
                <ul className="ml-4 list-disc">
                  {analytics.topInsights.map(([insight, count]: any) => (
                    <li key={insight}>{insight} <span className="text-xs text-slate-400">({count})</span></li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center text-[var(--color-text-muted)] py-8">No analytics data available.</div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default AnalyticsDrawer; 