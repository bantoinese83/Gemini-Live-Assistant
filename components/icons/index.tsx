import React from 'react';
import type { IconProps } from '../../types';

// Helper function to conditionally join class names.
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const defaultIconSize = 24; // Default size for icons if not specified.

/** PlayIcon component. Typically used for "start" or "play" actions. */
export const PlayIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" // Uses the text color of the parent by default
    width={size} 
    height={size} 
    className={cn("inline-block", className)}
    aria-hidden="true" // Assume decorative if used with text, override if standalone
    {...props}
  >
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

/** StopIcon component. Typically used for "stop" actions. */
export const StopIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size} 
    height={size} 
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
  </svg>
);

/** ResetIcon component. Typically used for "reset" or "refresh" actions. */
export const ResetIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" // Uses text color of parent
    width={size} 
    height={size} 
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

/** VideoOnIcon component. Indicates video is active or can be turned on. */
export const VideoOnIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
    width={size} 
    height={size} 
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
  </svg>
);

/** VideoOffIcon component. Indicates video is inactive or can be turned off. */
export const VideoOffIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    width={size} 
    height={size} 
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5-4.72-4.72a.75.75 0 0 0-1.06 1.06L14.69 12l-4.72 4.72a.75.75 0 1 0 1.06 1.06l4.72-4.72Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12a10.5 10.5 0 0 0 10.5 10.5h.75a10.5 10.5 0 0 0 10.5-10.5v-.75a10.5 10.5 0 0 0-10.5-10.5h-.75A10.5 10.5 0 0 0 1.5 11.25v.75Z" />
 </svg>
);

/** HistoryIcon component. Clock/history style for session history. */
export const HistoryIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v4.25l2.5 2.5" />
  </svg>
);

/** AnalyticsIcon component. Bar chart style for analytics/dashboard. */
export const AnalyticsIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="13" width="3" height="7" rx="1" fill="currentColor" />
    <rect x="10.5" y="9" width="3" height="11" rx="1" fill="currentColor" />
    <rect x="17" y="5" width="3" height="15" rx="1" fill="currentColor" />
  </svg>
);

/** RefreshIcon component. Circular arrow for refresh/re-analyze actions. */
export const RefreshIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 1 2.22 5.28M4.5 12V7.5m0 0H9" />
  </svg>
);

/** TrashIcon component. Trash bin for delete/discard actions. */
export const TrashIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V19a2 2 0 002 2h8a2 2 0 002-2V7.5M4 7.5h16M10 11v6m4-6v6M9 7.5V5a2 2 0 012-2h2a2 2 0 012 2v2.5" />
  </svg>
);

/** CheckIcon component. Checkmark for confirm/save actions. */
export const CheckIcon: React.FC<IconProps> = ({ size = defaultIconSize, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    width={size}
    height={size}
    className={cn("inline-block", className)}
    aria-hidden="true"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
