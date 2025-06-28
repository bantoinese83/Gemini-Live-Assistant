import React from 'react';

/**
 * A simple loading spinner component to indicate background activity.
 * It uses CSS animation and a themed accent color.
 */
const LoadingSpinner: React.FC<{ size?: number }> = React.memo(({ size = 48 }) => {
  return (
    <div 
      className="flex justify-center items-center h-full" 
      role="status" // Standard ARIA role for spinners
      aria-label="Loading content" // Provides a textual description for assistive technologies
      aria-busy="true"
    >
      {/* 
        Spinner Style:
        - `animate-spin`: Tailwind utility for CSS spin animation.
        - `rounded-full`: Makes the div circular.
        - `border-4`: Sets the thickness of the spinner's border.
        - `border-transparent`: Makes most of the border transparent.
        - `borderTopColor`: The `style` attribute is used to set only the top border's color
          to the themed accent color, creating the classic "C" shape or chasing dots effect.
      */}
      <div 
        className="animate-spin rounded-full border-4 border-transparent"
        style={{
          width: size,
          height: size,
          borderTopColor: 'var(--color-accent-teal)'
        }}
      ></div>
    </div>
  );
});

export default LoadingSpinner;
