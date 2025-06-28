import React, { useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Trash2, Check } from 'lucide-react';

interface SavePromptModalProps {
  open: boolean;
  isSaving: boolean;
  savingMode: 'none' | 'creating' | 'saving';
  saveError: string | null;
  onConfirm: (shouldSave: boolean) => void;
  onClose: () => void;
}

const SavePromptModal: React.FC<SavePromptModalProps> = ({
  open,
  isSaving,
  savingMode,
  saveError,
  onConfirm,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveElement.current = document.activeElement as HTMLElement;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        aria-label="Save Prompt Modal"
        className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-xl font-bold"
          aria-label="Close"
        >&times;</button>
        <h3 className="text-lg font-bold mb-4">Save this session?</h3>
        <p className="mb-6">Would you like to save the video and transcript for this session?</p>
        {isSaving ? (
          <div className="flex flex-col items-center justify-center py-4">
            <LoadingSpinner />
            <span className="mt-2 text-sm text-[var(--color-text-muted)]">
              {savingMode === 'creating' ? 'Creating session...' : 'Saving...'}
            </span>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => onConfirm(false)}
              className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              disabled={isSaving}
              aria-label="Discard session"
              title="Discard session"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              disabled={isSaving}
              aria-label="Save session"
              title="Save session"
            >
              <Check size={20} />
            </button>
          </div>
        )}
        {saveError && <div className="mt-4 text-red-500 text-sm text-center">{saveError}</div>}
      </div>
    </div>
  );
};

export default SavePromptModal; 