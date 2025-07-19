import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          teal: 'var(--color-accent-teal)',
          'teal-hover': 'var(--color-accent-teal-hover)',
          sky: 'var(--color-accent-sky)',
          'sky-hover': 'var(--color-accent-sky-hover)',
          green: 'var(--color-accent-green)',
          'green-hover': 'var(--color-accent-green-hover)',
          red: 'var(--color-accent-red)',
          'red-hover': 'var(--color-accent-red-hover)',
          amber: 'var(--color-accent-amber)',
          'amber-hover': 'var(--color-accent-amber-hover)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
        }
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      }
    },
  },
} satisfies Config 