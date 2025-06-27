import React from 'react';
import LoadingSpinner from './LoadingSpinner';

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-[var(--color-background-secondary)] rounded-2xl shadow-2xl p-6 max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-xl font-bold">&times;</button>
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
            <button onClick={() => onConfirm(false)} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" disabled={isSaving}>Discard</button>
            <button onClick={() => onConfirm(true)} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60" disabled={isSaving}>Save</button>
          </div>
        )}
        {saveError && <div className="mt-4 text-red-500 text-sm text-center">{saveError}</div>}
      </div>
    </div>
  );
};

export default SavePromptModal; 