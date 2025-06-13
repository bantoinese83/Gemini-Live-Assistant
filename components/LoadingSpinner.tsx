
import React from 'react';

/**
 * A simple loading spinner component to indicate background activity.
 * It uses CSS animation and a themed accent color.
 */
const LoadingSpinner: React.FC = React.memo(() => {
  return (
    <div 
      className="flex justify-center items-center h-full" 
      role="status" // Standard ARIA role for spinners
      aria-label="Loading content" // Provides a textual description for assistive technologies
    >
      {/* 
        Spinner Style:
        - `animate-spin`: Tailwind utility for CSS spin animation.
        - `rounded-full`: Makes the div circular.
        - `h-12 w-12`: Sets the size of the spinner.
        - `border-4`: Sets the thickness of the spinner's border.
        - `border-transparent`: Makes most of the border transparent.
        - `borderTopColor`: The `style` attribute is used to set only the top border's color
          to the themed accent color, creating the classic "C" shape or chasing dots effect.
      */}
      <div 
        className="animate-spin rounded-full h-12 w-12 border-4 border-transparent"
        style={{ borderTopColor: 'var(--color-accent-teal)' }} 
      ></div>
    </div>
  );
});

export default LoadingSpinner;
