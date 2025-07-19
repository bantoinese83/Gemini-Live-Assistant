import React, { useEffect, useRef, useState } from 'react';
import { TRANSCRIPT_SCROLL_BEHAVIOR } from '../constants';
import { BORDER_RADIUS_LG, TRANSITION_FAST } from '../theme';
import { ChevronDown, Copy, Check } from 'lucide-react';

/**
 * Props for the TranscriptBubble component.
 */
interface TranscriptBubbleProps {
  /** The text content of the transcript bubble. */
  text: string;
  /** Boolean indicating if this part of the transcript is final. Affects styling (e.g., opacity). */
  isFinal: boolean;
  /** Specifies if the bubble is from the 'user' or 'model', affecting its appearance. */
  variant: 'user' | 'model';
}

/**
 * Renders an individual transcript bubble with appropriate styling based on whether
 * it's from the user or the AI model, and whether the content is final.
 */
const TranscriptBubble: React.FC<TranscriptBubbleProps> = React.memo(({ text, isFinal, variant }) => {
  const [copied, setCopied] = useState(false);
  const baseClass = `p-3 mb-2 shadow-lg leading-relaxed text-sm sm:text-base ${BORDER_RADIUS_LG} ${TRANSITION_FAST} max-w-full break-words fade-in relative group`;
  // Using Google theme colors for bubble colors
  const userColor = "bg-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue-hover)] text-white self-end"; 
  const modelColor = "bg-[var(--color-background-tertiary)] hover:bg-[var(--color-border-primary)] text-[var(--color-text-primary)] self-start border border-[var(--color-border-primary)]";
  const interimOpacity = "opacity-70";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <div 
      className={`${baseClass} ${variant === 'user' ? userColor : modelColor} ${!isFinal ? interimOpacity : ''}`}
      role="log" // Each bubble can be considered a log entry in the conversation
      aria-live={isFinal ? "off" : "polite"} // Announce interim updates
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex-1">{text}</span>
        {isFinal && (
          <button
            onClick={handleCopy}
            className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white/50 ${
              variant === 'user' ? 'text-white/80 hover:text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
            aria-label="Copy transcript text"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
      {!isFinal && (
        <div className="flex items-center gap-1 mt-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs opacity-70">Typing...</span>
        </div>
      )}
    </div>
  );
});

/**
 * Props for the TranscriptColumn component.
 */
interface TranscriptColumnProps {
  /** The title of the transcript column (e.g., "You", "AI Assistant"). */
  title: string;
  /** Tailwind CSS class for styling the title's text color. */
  titleColorClass: string;
  /** The full transcript text for this column. */
  transcript: string;
  /** Boolean indicating if the current transcript text is final. */
  isFinal: boolean;
  /** Specifies if the column is for 'user' or 'model' transcripts. */
  variant: 'user' | 'model';
  /** Message to display when the transcript is empty. */
  emptyMessage: string;
}

/**
 * Renders a column for displaying transcripts (either user's or AI's).
 * Includes a title, a scrollable area for transcript bubbles, and an auto-scroll feature.
 */
const TranscriptColumn: React.FC<TranscriptColumnProps> = React.memo(({ 
  title, 
  titleColorClass, 
  transcript, 
  isFinal, 
  variant, 
  emptyMessage 
}) => {
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Auto-scroll to the bottom when new transcript messages arrive.
  useEffect(() => {
    const container = scrollableContainerRef.current;
    if (container && endOfMessagesRef.current) {
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 30;
        if (isScrolledToBottom) {
             endOfMessagesRef.current.scrollIntoView({ behavior: TRANSCRIPT_SCROLL_BEHAVIOR });
        }
    }
  }, [transcript]);

  // Show scroll-to-bottom button if user scrolls up
  useEffect(() => {
    const container = scrollableContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 30;
      setShowScrollButton(!isScrolledToBottom);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToBottom = () => {
    setIsScrolling(true);
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setIsScrolling(false), 500);
  };

  return (
    <section className={`flex flex-col bg-[var(--color-background-secondary)] p-3 sm:p-4 ${BORDER_RADIUS_LG} shadow-inner h-full overflow-hidden`} aria-labelledby={`${variant}-transcript-title`}>
      <h3 id={`${variant}-transcript-title`} className={`text-lg sm:text-xl font-semibold mb-3 sticky top-0 bg-[var(--color-background-secondary)] py-2 z-10 border-b border-[var(--color-border-primary)] ${titleColorClass} flex items-center justify-between`}>
        <span>{title}</span>
        {transcript && (
          <span className="text-xs font-normal text-[var(--color-text-secondary)]">
            {transcript.length} chars
          </span>
        )}
      </h3>
      <div 
        ref={scrollableContainerRef} 
        className="flex-grow overflow-y-auto space-y-1 pr-2 custom-scrollbar flex flex-col relative" 
        aria-live="polite" 
        tabIndex={0}
        role="log"
        aria-label={`${title} transcript messages`}
      >
        {transcript ? (
          <TranscriptBubble text={transcript} isFinal={isFinal} variant={variant} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 bg-[var(--color-background-tertiary)] rounded-full flex items-center justify-center mb-3">
              {variant === 'user' ? (
                <span className="text-2xl">👤</span>
              ) : (
                <span className="text-2xl">🤖</span>
              )}
            </div>
            <p className="text-[var(--color-text-muted)] italic">{emptyMessage}</p>
          </div>
        )}
        <div ref={endOfMessagesRef} />
        {showScrollButton && (
          <button
            className={`absolute bottom-4 right-4 bg-[var(--color-accent-blue)] text-white px-3 py-2 rounded-full shadow-lg hover:bg-[var(--color-accent-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] transition-all duration-200 hover:scale-105 ${
              isScrolling ? 'animate-pulse' : ''
            }`}
            onClick={handleScrollToBottom}
            aria-label="Scroll to latest transcript"
            disabled={isScrolling}
          >
            <ChevronDown size={16} className={isScrolling ? 'animate-bounce' : ''} />
          </button>
        )}
      </div>
    </section>
  );
});

/**
 * Props for the TranscriptDisplay component.
 */
interface TranscriptDisplayProps {
  /** The current transcript from the user. */
  userTranscript: string;
  /** Boolean indicating if the user's transcript is final. */
  userTranscriptIsFinal: boolean;
  /** The current transcript from the AI model. */
  modelTranscript: string;
  /** Boolean indicating if the AI model's transcript is final. */
  modelTranscriptIsFinal: boolean;
}

/**
 * Main component for displaying both user and AI model transcripts side-by-side (on larger screens)
 * or stacked (on smaller screens, though current layout is two columns).
 */
const TranscriptDisplay: React.FC<TranscriptDisplayProps> = React.memo(({
  userTranscript,
  userTranscriptIsFinal,
  modelTranscript,
  modelTranscriptIsFinal,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full" role="log" aria-live="polite" aria-atomic="false">
      <TranscriptColumn
        title="You"
        titleColorClass="text-[var(--color-accent-blue)]"
        transcript={userTranscript}
        isFinal={userTranscriptIsFinal}
        variant="user"
        emptyMessage="Your speech will appear here..."
      />
      <TranscriptColumn
        title="AI Assistant"
        titleColorClass="text-[var(--color-accent-green)]"
        transcript={modelTranscript}
        isFinal={modelTranscriptIsFinal}
        variant="model"
        emptyMessage="Assistant's response will appear here..."
      />
    </div>
  );
});

export default TranscriptDisplay;
