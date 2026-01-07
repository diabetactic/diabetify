const ionic = require('@aparajita/tailwind-ionic');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './src/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      minHeight: {
        '44px': '44px',
      },
      minWidth: {
        '44px': '44px',
      },
    },
  },
  plugins: [
    ionic(),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        diabetactic: {
          primary: 'var(--ion-color-primary)',
          'primary-content': 'var(--ion-color-primary-contrast)',
          secondary: 'var(--ion-color-secondary)',
          'secondary-content': 'var(--ion-color-secondary-contrast)',
          accent: '#667eea',
          'accent-content': '#ffffff',
          neutral: '#0d171c',
          'neutral-content': '#ffffff',
          'base-100': 'var(--ion-background-color)',
          'base-200': '#f5f7f8',
          'base-300': '#e5e7eb',
          'base-content': 'var(--ion-text-color)',
          info: 'var(--ion-color-primary)',
          success: 'var(--ion-color-success)',
          warning: 'var(--ion-color-warning)',
          error: 'var(--ion-color-danger)',
        },
      },
      'dark',
    ],
  },
};
