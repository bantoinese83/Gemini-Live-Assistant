import React, { useEffect } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You could log error to an error reporting service here
    // console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)] p-4">
          <div className="bg-red-700 text-white rounded-lg shadow-lg p-6 max-w-lg w-full text-center">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="mb-4">An unexpected error occurred. Please try reloading the app.</p>
            <pre className="bg-red-900/80 text-xs rounded p-2 mb-4 overflow-x-auto max-w-full whitespace-pre-wrap">{this.state.error?.message}</pre>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded bg-white text-red-700 font-semibold hover:bg-red-200 transition"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, actionLabel, onAction, onClose, type = 'info', duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 min-w-[220px] max-w-[90vw] text-base font-medium transition-all animate-fade-in
        ${type === 'success' ? 'bg-green-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}
      role="status"
      aria-live="polite"
      tabIndex={0}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          className="ml-4 px-3 py-1 rounded bg-white/20 hover:bg-white/40 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-white"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
      <button
        className="ml-2 text-white/70 hover:text-white text-lg font-bold focus:outline-none"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default ErrorBoundary; 