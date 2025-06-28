import React from 'react';
import { BORDER_RADIUS_LG } from '../theme'; // Using theme constant for border radius

/**
 * Props for the ApiKeyIndicator component.
 */
interface ApiKeyIndicatorProps {
  /** Boolean indicating if the API key is missing. If false, the component renders nothing. */
  apiKeyMissing: boolean;
}

/**
 * Displays a prominent warning message if the API key is missing.
 * This component is crucial for alerting the user to a critical configuration issue.
 */
const ApiKeyIndicator: React.FC<ApiKeyIndicatorProps> = React.memo(({ apiKeyMissing }) => {
  if (!apiKeyMissing) {
    return null; // Render nothing if the API key is not missing.
  }

  return (
    // Using direct Tailwind classes for alert colors as they are conventional and clear.
    <div 
      className={`bg-red-600 border border-red-700/50 text-white p-3 sm:p-4 ${BORDER_RADIUS_LG} shadow-lg text-center my-4 mx-auto max-w-2xl`}
      role="alert" // Indicates this is an important alert message
      aria-live="assertive" // Ensures screen readers announce this immediately
    >
      <h3 className="font-bold text-md sm:text-lg mb-1">API Key Configuration Error</h3>
      <p className="text-sm sm:text-base">
        The <code>API_KEY</code> environment variable is missing or not accessible.
      </p>
      <p className="text-sm sm:text-base mt-1">
        Please ensure it is correctly configured for the application to function.
      </p>
    </div>
  );
});

export default ApiKeyIndicator;
