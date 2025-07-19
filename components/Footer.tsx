import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Mail, 
  ExternalLink, 
  Heart, 
  Coffee, 
  Star, 
  Download, 
  Info,
  Globe,
  Shield,
  Zap,
  Users
} from 'lucide-react';

const Footer: React.FC = () => {
  const [currentYear] = useState(new Date().getFullYear());
  const [showInfo, setShowInfo] = useState(false);
  const [uptime, setUptime] = useState(0);

  // Simulate uptime counter
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="custom-footer w-full bg-[var(--color-background-primary)] border-t-4 border-double border-[var(--color-border-primary)] shadow-inner z-40">
      {/* Main Footer Content */}
      <div className="py-4 px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Section - App Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                © {currentYear} GLA
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">v1.0.0</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-[var(--color-accent-yellow)]" />
                <span>Uptime: {formatUptime(uptime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield size={12} className="text-[var(--color-accent-green)]" />
                <span>Secure</span>
              </div>
            </div>
          </div>

          {/* Center Section - Quick Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/bantoinese83/Gemini-Live-Assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors duration-200 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent-blue)]"
              title="View on GitHub"
            >
              <Github size={14} />
              GitHub
              <ExternalLink size={12} />
            </a>
            
            <a
              href="mailto:support@example.com"
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors duration-200 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent-blue)]"
              title="Contact Support"
            >
              <Mail size={14} />
              Support
            </a>
            
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] transition-colors duration-200 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent-blue)]"
              title="App Information"
            >
              <Info size={14} />
              Info
            </button>
          </div>

          {/* Right Section - Stats & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1">
                <Users size={12} className="text-[var(--color-accent-blue)]" />
                <span>Active Users: 1</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe size={12} className="text-[var(--color-accent-green)]" />
                <span>Online</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-accent-red)]/10 hover:bg-[var(--color-accent-red)]/20 transition-colors duration-200 text-xs font-medium text-[var(--color-accent-red)]"
                title="Support the Project"
              >
                <Heart size={12} />
                Support
              </button>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-accent-yellow)]/10 hover:bg-[var(--color-accent-yellow)]/20 transition-colors duration-200 text-xs font-medium text-[var(--color-accent-yellow)]"
                title="Buy us a Coffee"
              >
                <Coffee size={12} />
                Coffee
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="px-6 py-4 bg-[var(--color-background-secondary)] border-t border-[var(--color-border-primary)] animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1">
                <Zap size={14} className="text-[var(--color-accent-yellow)]" />
                Features
              </h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• Real-time voice & video</div>
                <div>• Screen sharing</div>
                <div>• 13 AI personas</div>
                <div>• Session recording</div>
                <div>• Analytics dashboard</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1">
                <Shield size={14} className="text-[var(--color-accent-green)]" />
                Privacy & Security
              </h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• End-to-end encryption</div>
                <div>• Local processing</div>
                <div>• No data retention</div>
                <div>• GDPR compliant</div>
                <div>• Open source</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1">
                <Globe size={14} className="text-[var(--color-accent-blue)]" />
                Technology
              </h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• React 19 + TypeScript</div>
                <div>• Google Gemini Live API</div>
                <div>• WebRTC & Web Audio</div>
                <div>• Tailwind CSS v4</div>
                <div>• Supabase backend</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1">
                <Star size={14} className="text-[var(--color-accent-yellow)]" />
                Quick Stats
              </h4>
              <div className="space-y-1 text-[var(--color-text-secondary)]">
                <div>• Uptime: {formatUptime(uptime)}</div>
                <div>• Version: 1.0.0</div>
                <div>• Build: Production</div>
                <div>• Environment: Browser</div>
                <div>• Status: Operational</div>
              </div>
            </div>
          </div>
          
          {/* Bottom Links */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--color-text-muted)]">
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">API Reference</a>
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">Changelog</a>
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">Roadmap</a>
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">Contributing</a>
            <a href="#" className="hover:text-[var(--color-accent-blue)] transition-colors">License</a>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer; 