
import React, { useState, useCallback, useEffect } from 'react';
import Button from './common/Button';
import { BORDER_RADIUS_MD, TRANSITION_MEDIUM, FOCUS_RING_BASE } from '../theme';

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
  // Local state for the textarea, initialized with the current global instruction.
  const [instruction, setInstruction] = useState(currentInstruction);

  // Update local state if the global currentInstruction prop changes externally.
  useEffect(() => {
    setInstruction(currentInstruction);
  }, [currentInstruction]);

  /** Handles changes to the textarea input. */
  const handleInstructionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstruction(e.target.value);
  }, []);

  /** Handles form submission to apply the new instruction. */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    onInstructionSet(instruction.trim()); // Trim whitespace before setting
  }, [instruction, onInstructionSet]);

  return (
    <form onSubmit={handleSubmit} className="p-1 space-y-3">
      <label htmlFor="system-instruction" className="block text-sm font-medium text-[var(--color-text-secondary)]">
        AI Persona (System Instruction)
      </label>
      <textarea
        id="system-instruction"
        rows={3}
        className={`w-full p-2.5 border border-[var(--color-border-primary)] ${BORDER_RADIUS_MD} shadow-sm bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] disabled:opacity-60 ${TRANSITION_MEDIUM} ${FOCUS_RING_BASE} focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]`}
        value={instruction}
        onChange={handleInstructionChange}
        placeholder="e.g., You are a helpful and witty assistant."
        disabled={disabled}
        aria-describedby="system-instruction-help"
        aria-label="AI Persona System Instruction Input"
      />
      <p id="system-instruction-help" className="text-xs text-[var(--color-text-muted)]">
        Define how the AI should behave. Changes apply on next session reset or new recording start.
      </p>
      <Button
        type="submit" // HTML button type for form submission
        variant="primary"
        size="md"
        className="w-full"
        // Disable if input is disabled, or if the local instruction hasn't changed from the current one.
        disabled={disabled || instruction.trim() === currentInstruction.trim()}
        aria-label="Apply System Instruction"
      >
        Apply Instruction
      </Button>
    </form>
  );
});

export default SystemInstructionInput;
