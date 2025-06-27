import React from 'react';

const SuccessOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 pointer-events-none animate-fade-in">
      {/* Animated checkmark */}
      <svg width="96" height="96" viewBox="0 0 96 96" className="drop-shadow-lg animate-pop" fill="none">
        <circle cx="48" cy="48" r="44" stroke="#22c55e" strokeWidth="8" fill="#e6faed" />
        <path
          d="M32 50l12 12 20-24"
          stroke="#22c55e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <animate attributeName="stroke-dasharray" from="0,60" to="36,24" dur="0.5s" fill="freeze" />
        </path>
      </svg>
      {/* Simple confetti dots */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${48 + 36 * Math.cos((i / 18) * 2 * Math.PI)}%`,
              top: `${48 + 36 * Math.sin((i / 18) * 2 * Math.PI)}%`,
              background: [
                '#22c55e', '#fbbf24', '#3b82f6', '#ef4444', '#a21caf', '#f472b6', '#f59e42', '#10b981', '#eab308'
              ][i % 9],
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop { animation: pop 0.5s cubic-bezier(.68,-0.55,.27,1.55) forwards; }
        @keyframes confetti {
          0% { opacity: 0; transform: scale(0.5) translateY(0); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.2) translateY(80px); }
        }
        .animate-confetti { animation: confetti 1.2s cubic-bezier(.68,-0.55,.27,1.55) forwards; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s; }
      `}</style>
    </div>
  );
};

export default SuccessOverlay; 