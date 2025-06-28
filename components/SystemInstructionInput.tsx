import React, { useState, useCallback, useEffect, useRef } from 'react';
import Button from './common/Button';
import { BORDER_RADIUS_MD, TRANSITION_MEDIUM, FOCUS_RING_BASE } from '../theme';
import { CheckIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

/**
 * Props for the SystemInstructionInput component.
 */
interface SystemInstructionInputProps {
  /** The current system instruction string. */
  currentInstruction: string;
  /** Callback function invoked when a new instruction is submitted. Receives the new instruction string. */
  onInstructionSet: (instruction: string) => void;
  /** Boolean indicating if the input and button should be disabled (e.g., during recording). */
  disabled: boolean;
}

/**
 * A form component allowing users to input or modify the system instruction (persona) for the AI.
 * Changes are applied via the `onInstructionSet` callback.
 */
const SystemInstructionInput: React.FC<SystemInstructionInputProps> = React.memo(({
  currentInstruction,
  onInstructionSet,
  disabled,
}) => {
  const [instruction, setInstruction] = useState(currentInstruction);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInstruction(currentInstruction);
    setApplied(true);
    setIsApplying(false);
  }, [currentInstruction]);

  // Debounced auto-apply
  useEffect(() => {
    if (instruction.trim() === currentInstruction.trim()) {
      setApplied(true);
      setIsApplying(false);
      return;
    }
    setApplied(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (disabled) return;
    setIsApplying(true);
    debounceRef.current = setTimeout(() => {
      onInstructionSet(instruction.trim());
      setIsApplying(false);
      setApplied(true);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruction, disabled]);

  // Apply on blur for immediate feedback
  const handleBlur = () => {
    if (instruction.trim() !== currentInstruction.trim() && !disabled) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setIsApplying(true);
      onInstructionSet(instruction.trim());
      setIsApplying(false);
      setApplied(true);
    }
  };

  const handleInstructionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstruction(e.target.value);
  }, []);

  return (
    <form className="p-1 space-y-3" autoComplete="off" onSubmit={e => e.preventDefault()}>
      <label htmlFor="system-instruction" className="block text-sm font-medium text-[var(--color-text-secondary)]">
        AI Persona (System Instruction)
      </label>
      <div className="relative">
        <textarea
          id="system-instruction"
          rows={3}
          className={`w-full p-2.5 border border-[var(--color-border-primary)] rounded-md shadow-sm bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] disabled:opacity-60 transition focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)] pr-10`}
          value={instruction}
          onChange={handleInstructionChange}
          onBlur={handleBlur}
          placeholder="e.g., You are a helpful and witty assistant."
          disabled={disabled}
          aria-describedby="system-instruction-help"
          aria-label="AI Persona System Instruction Input"
        />
        <span className="absolute top-2 right-2" aria-live="polite">
          {isApplying ? <LoadingSpinner size={18} /> : applied ? <CheckIcon size={18} className="text-green-400" title="Instruction applied" aria-label="Instruction applied" /> : null}
        </span>
      </div>
      <p id="system-instruction-help" className="text-xs text-[var(--color-text-muted)]">
        Define how the AI should behave. Changes are applied automatically.
      </p>
    </form>
  );
});

export default SystemInstructionInput;
