
import React from 'react';
import type { ButtonProps } from '../../types'; // IconProps is used internally by ButtonProps
import { 
    TRANSITION_FAST, FOCUS_RING_BASE, FOCUS_RING_OFFSET_LIGHT 
} from '../../theme';

/**
 * A common, versatile Button component with standardized styling, variants, sizes,
 * and support for icons and loading states.
 *
 * @param variant - The visual style of the button (e.g., 'primary', 'secondary'). Defaults to 'primary'.
 * @param size - The size of the button ('sm', 'md', 'lg'). Defaults to 'md'.
 * @param leftIcon - An optional React element (typically an SVG icon) to display to the left of the button text.
 * @param rightIcon - An optional React element (typically an SVG icon) to display to the right of the button text.
 * @param isLoading - If true, displays a loading spinner and disables the button. Defaults to false.
 * @param disabled - If true, disables the button. Defaults to false.
 * @param className - Additional CSS classes to apply to the button.
 * @param children - The content of the button (typically text).
 * @param props - Other standard HTML button attributes.
 */
const Button: React.FC<ButtonProps> = React.memo(({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = `inline-flex items-center justify-center font-semibold border shadow-sm focus:outline-none ${FOCUS_RING_BASE} ${FOCUS_RING_OFFSET_LIGHT} ${TRANSITION_FAST} disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]`;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md', // Tailwind: rounded-md
    md: 'px-4 py-2 text-sm rounded-lg', // Tailwind: rounded-lg
    lg: 'px-6 py-3 text-base rounded-lg', // Tailwind: rounded-lg
  };

  const variantClasses = {
    primary: `bg-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal-hover)] border-transparent text-white focus:ring-[var(--color-accent-teal)]`,
    secondary: `bg-[var(--color-background-tertiary)] hover:bg-slate-600 border-transparent text-[var(--color-text-primary)] focus:ring-slate-500`,
    danger: `bg-[var(--color-accent-red)] hover:bg-[var(--color-accent-red-hover)] border-transparent text-white focus:ring-[var(--color-accent-red)]`,
    warning: `bg-[var(--color-accent-amber)] hover:bg-[var(--color-accent-amber-hover)] border-transparent text-white focus:ring-[var(--color-accent-amber)]`,
    success: `bg-[var(--color-accent-green)] hover:bg-[var(--color-accent-green-hover)] border-transparent text-white focus:ring-[var(--color-accent-green)]`,
    ghost: `bg-transparent hover:bg-slate-700/70 border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:ring-[var(--color-accent-teal)]`,
  };

  const iconSizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const loadingSpinnerSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const combinedClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button
      type="button" // Default to type="button" to prevent accidental form submissions
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className={`animate-spin ${leftIcon || children || rightIcon ? 'mr-2' : ''} ${loadingSpinnerSize} text-white`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true" // Decorative spinner
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && React.cloneElement(leftIcon, { className: `${iconSizeClass} ${children || rightIcon ? 'mr-2' : ''}` })}
      {!isLoading && children}
      {!isLoading && rightIcon && React.cloneElement(rightIcon, { className: `${iconSizeClass} ${children ? 'ml-2' : ''}` })}
    </button>
  );
});

export default Button;
