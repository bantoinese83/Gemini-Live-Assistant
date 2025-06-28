import React from 'react';
import { History, BarChart2 } from 'lucide-react';

interface HeaderProps {
  onShowHistory: () => void;
  onToggleDashboard: () => void;
  showDashboard: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShowHistory, onToggleDashboard, showDashboard }) => (
  <header className="custom-header w-full flex flex-row items-center justify-between py-2 sm:py-3 bg-[var(--color-background-primary)] border-b-4 border-double border-[var(--color-border-primary)]">
    <span className="custom-logo text-4xl sm:text-6xl md:text-7xl font-extrabold uppercase tracking-tight relative select-none">
      Gemini <span className="text-[var(--color-accent-sky)]">Live</span>
    </span>
    <div className="flex flex-col gap-4 mr-8 sm:mr-12">
      <button
        className="w-12 h-12 rounded-full bg-[var(--color-accent-teal)] shadow-xl flex items-center justify-center hover:bg-[var(--color-accent-teal-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-sky)] transition"
        onClick={onShowHistory}
        aria-label="Show History"
        title="Show History"
      >
        <History size={24} className="text-white" />
      </button>
      <button
        className="w-12 h-12 rounded-full bg-[var(--color-accent-sky)] shadow-xl flex items-center justify-center hover:bg-[var(--color-accent-sky-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-teal)] transition"
        onClick={onToggleDashboard}
        aria-label={showDashboard ? 'Hide Analytics' : 'Show Analytics'}
        title={showDashboard ? 'Hide Analytics' : 'Show Analytics'}
      >
        <BarChart2 size={24} className="text-white" />
      </button>
    </div>
  </header>
);

export default Header; 