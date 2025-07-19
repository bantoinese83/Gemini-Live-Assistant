import React, { useRef, useEffect } from 'react';
import ActivityRing, { ConcentricActivityRings } from './common/ActivityRing';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  analytics: any;
  onClose: () => void;
}

const sentimentColors: Record<string, string> = {
  positive: '#34a853', // Google Green
  negative: '#ea4335', // Google Red
  neutral: '#4285f4', // Google Blue
  unknown: '#9aa0a6', // Google Light Gray
};

// Truncate label helper
const truncate = (str: string, n: number) => (str.length > n ? str.slice(0, n - 1) + '…' : str);

// Custom tooltip for insights
const InsightsTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { insight, count } = payload[0].payload;
    return (
      <div className="bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] p-2 rounded shadow-lg max-w-xs text-xs border border-[var(--color-border-primary)]">
        <div className="font-semibold mb-1">Insight</div>
        <div className="mb-1">{insight}</div>
        <div className="text-[var(--color-accent-blue)]">Count: {count}</div>
      </div>
    );
  }
  return null;
};

// Persona metrics mapping
const PERSONA_METRICS: Record<string, { key: string; label: string; type: 'percent' | 'score'; color: string }[]> = {
  'Interview Coach': [
    { key: 'starUsage', label: 'STAR Method Usage', type: 'percent', color: '#4285f4' }, // Google Blue
    { key: 'clarity', label: 'Clarity', type: 'score', color: '#34a853' }, // Google Green
  ],
  'Dating Coach': [
    { key: 'confidence', label: 'Confidence', type: 'score', color: '#fbbc05' }, // Google Yellow
    { key: 'authenticity', label: 'Authenticity', type: 'score', color: '#ea4335' }, // Google Red
  ],
  'Motivational Mentor': [
    { key: 'motivation', label: 'Motivation', type: 'score', color: '#34a853' }, // Google Green
    { key: 'confidence', label: 'Confidence', type: 'score', color: '#fbbc05' }, // Google Yellow
  ],
  'Friendly Conversationalist': [
    { key: 'engagement', label: 'Engagement', type: 'score', color: '#4285f4' }, // Google Blue
    { key: 'comfort', label: 'Comfort', type: 'score', color: '#34a853' }, // Google Green
  ],
  'Tech Support Agent': [
    { key: 'understanding', label: 'Understanding', type: 'score', color: '#4285f4' }, // Google Blue
    { key: 'frustration', label: 'Frustration', type: 'score', color: '#ea4335' }, // Google Red
  ],
  'Language Tutor': [
    { key: 'accuracy', label: 'Accuracy', type: 'percent', color: '#34a853' }, // Google Green
    { key: 'fluency', label: 'Fluency', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Fitness Coach': [
    { key: 'energy', label: 'Energy', type: 'score', color: '#fbbc05' }, // Google Yellow
    { key: 'goalClarity', label: 'Goal Clarity', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Standup Comedian': [
    { key: 'laughter', label: 'Laughter', type: 'score', color: '#fbbc05' }, // Google Yellow
    { key: 'engagement', label: 'Engagement', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Startup Advisor': [
    { key: 'innovation', label: 'Innovation', type: 'score', color: '#34a853' }, // Google Green
    { key: 'feasibility', label: 'Feasibility', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Storytelling Companion': [
    { key: 'creativity', label: 'Creativity', type: 'score', color: '#ea4335' }, // Google Red
    { key: 'engagement', label: 'Engagement', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Mindfulness Guide': [
    { key: 'calmness', label: 'Calmness', type: 'score', color: '#34a853' }, // Google Green
    { key: 'awareness', label: 'Awareness', type: 'score', color: '#4285f4' }, // Google Blue
  ],
  'Debate Partner': [
    { key: 'logic', label: 'Logic', type: 'score', color: '#fbbc05' }, // Google Yellow
    { key: 'persuasion', label: 'Persuasion', type: 'score', color: '#ea4335' }, // Google Red
  ],
  'Coding Buddy': [
    { key: 'problemSolving', label: 'Problem Solving', type: 'score', color: '#34a853' }, // Google Green
    { key: 'codeQuality', label: 'Code Quality', type: 'score', color: '#4285f4' }, // Google Blue
  ],
};

const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({ open, loading, error, analytics, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    lastActiveElement.current = document.activeElement as HTMLElement;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex="-1"]'
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
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
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
  if (!open) return null;

  // Prepare data for visuals
  const avgDurationGoal = 60; // e.g. 1 min as a visual goal
  const totalSessionsGoal = 10; // e.g. 10 sessions as a visual goal
  const sentiment = analytics?.mostCommonSentiment || 'unknown';
  const sentimentColor = sentimentColors[sentiment] || '#a3a3a3';
  const topInsights = (analytics?.topInsights || []).map(([insight, count]: [string, number]) => ({ insight, count }));
  const persona = analytics?.persona || 'Unknown';
  const personaMetrics = PERSONA_METRICS[persona] || [];

  // Before rendering ActivityRing for sentiment, abbreviate the label
  const sentimentShortLabel =
    sentiment.toLowerCase().includes('positive') ? 'Positive' :
    sentiment.toLowerCase().includes('negative') ? 'Negative' :
    sentiment.toLowerCase().includes('neutral') ? 'Neutral' :
    'Unknown';

  // Only build metrics if analytics is available
  const metrics = analytics ? [
    {
      value: analytics.totalSessions,
      max: totalSessionsGoal,
      color: '#4285f4', // Google Blue
      label: 'Sessions',
      unit: '',
    },
    {
      value: analytics.avgDuration,
      max: avgDurationGoal,
      color: '#34a853', // Google Green
      label: 'Avg. Secs',
      unit: 's',
    },
    {
      value: 1,
      max: 1,
      color: sentimentColor,
      label: sentimentShortLabel,
      unit: '',
    },
    // Optionally add persona metrics here
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/40 transition-opacity" aria-hidden="true" onClick={onClose} />
      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        className="relative h-full w-full sm:w-[28rem] md:w-[32rem] max-w-full bg-[var(--color-background-secondary)] rounded-l-2xl shadow-2xl border-l border-[var(--color-border-primary)] flex flex-col animate-slide-in-right focus:outline-none"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Analytics Drawer"
        style={{ right: 0, top: 0, position: 'fixed' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Session Analytics</h2>
          <button onClick={onClose} className="text-3xl font-bold px-3 py-1 rounded hover:bg-[var(--color-background-tertiary)] focus:outline-none text-[var(--color-text-primary)]" aria-label="Close">×</button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto min-h-0 flex flex-col gap-10">
          {loading ? (
            <div className="text-center text-[var(--color-text-muted)] py-8">Loading...</div>
          ) : error ? (
            <div className="text-[var(--color-accent-red)] text-center py-8">{error}</div>
          ) : analytics ? (
            <div className="flex flex-col gap-10">
              {/* Concentric Activity Rings Row */}
              <ConcentricActivityRings metrics={metrics} size={180} strokeWidth={18} />
              {/* Top Insights */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-inner flex flex-col gap-4">
                <h3 className="font-semibold text-accent-400 text-lg mb-2">Top Insights</h3>
                {topInsights.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {topInsights.map((insightObj: { insight: string; count: number }, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 text-accent-400">•</span>
                        <span className="text-slate-100 text-sm leading-snug break-words">{insightObj.insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-400 text-xs">No insights available.</div>
                )}
              </div>
              {/* Fallback text summary */}
              <div className="rounded-xl bg-slate-900/80 p-5 flex flex-col items-center gap-2 shadow border border-slate-700">
                <div className="flex gap-8 mb-2">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-accent-400">{analytics.totalSessions}</span>
                    <span className="text-xs text-slate-400 mt-1">Total Sessions</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-green-400">{analytics.avgDuration.toFixed(1)}s</span>
                    <span className="text-xs text-slate-400 mt-1">Avg. Duration</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold" style={{ color: sentimentColor }}>{sentimentShortLabel}</span>
                    <span className="text-xs text-slate-400 mt-1">Sentiment</span>
                  </div>
                </div>
                <div className="text-xs text-slate-300 text-center mt-2">
                  <div><span className="font-semibold">Most Common Sentiment:</span> {sentiment}</div>
                  {analytics.topInsights && analytics.topInsights.length > 0 && (
                    <div className="mt-1"><span className="font-semibold">Top Insight:</span> {topInsights[0]?.insight}</div>
                  )}
                </div>
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