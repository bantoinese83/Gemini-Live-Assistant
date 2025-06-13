
// Animation Durations (in milliseconds)
export const DURATION_FAST = 150;
export const DURATION_MEDIUM = 300;
export const DURATION_SLOW = 500;

// Tailwind Transition Classes (mirroring durations for consistency)
export const TRANSITION_FAST = `transition-all duration-${DURATION_FAST} ease-in-out`;
export const TRANSITION_MEDIUM = `transition-all duration-${DURATION_MEDIUM} ease-in-out`;
export const TRANSITION_SLOW = `transition-all duration-${DURATION_SLOW} ease-in-out`;

// Focus Ring base style
export const FOCUS_RING_BASE = 'focus:outline-none focus:ring-2 focus:ring-offset-2';
export const FOCUS_RING_OFFSET_DARK = 'focus:ring-offset-slate-900'; // For elements on dark bg
export const FOCUS_RING_OFFSET_LIGHT = 'focus:ring-offset-slate-800';// For elements on lighter dark bg

// Specific Color Roles (if needed in JS, otherwise prefer CSS variables or Tailwind classes)
// Example:
// export const colors = {
//   accent: 'var(--color-accent-teal)', // Reference CSS variable
// };

// Standard Border Radius
export const BORDER_RADIUS_SM = 'rounded-md';
export const BORDER_RADIUS_MD = 'rounded-lg';
export const BORDER_RADIUS_LG = 'rounded-xl';
