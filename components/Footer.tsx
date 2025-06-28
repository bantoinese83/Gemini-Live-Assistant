import React from 'react';

const Footer: React.FC = () => (
  <footer className="custom-footer w-full py-4 bg-[var(--color-background-primary)] border-t-4 border-double border-[var(--color-border-primary)] text-center text-xs font-bold uppercase text-[var(--color-text-muted)] shadow-inner z-40">
    © {new Date().getFullYear()} Gemini Live Assistant &nbsp;|&nbsp; v1.0.0 &nbsp;|&nbsp;
    <a
      href="https://github.com/bantoinese83/Gemini-Live-Assistant"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-accent-teal)] hover:underline font-semibold"
    >
      Project on GitHub
    </a>
    &nbsp;|&nbsp;
    <a href="mailto:support@example.com" className="hover:underline">
      Support
    </a>
  </footer>
);

export default Footer; 