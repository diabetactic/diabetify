// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

const diabetacticRules = {
  rules: {
    'no-await-ionic-overlay-create': require('./eslint-rules/no-await-ionic-overlay-create'),
  },
};

module.exports = tseslint.config(
  {
    ignores: [
      'projects/**/*',
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      'android/**/*',
      'www/**/*',
      '.angular/**/*',
      '.browser-pilot/**/*',
      '.turbo/**/*',
      'playwright-report/**/*',
      'reports/**/*',
      'evidence/**/*',
    ],
  },

  // 1. Base ESLint (Applies to all, mostly JS/TS)
  {
    ...eslint.configs.recommended,
    rules: {
      'no-case-declarations': 'off',
    },
  },

  // 2. TypeScript Recommended (Scoped to .ts only)
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.ts'],
  })),
  // ...tseslint.configs.stylistic.map(config => ({ ...config, files: ['**/*.ts'] })),

  // 3. Angular TS Recommended (Scoped to .ts only)
  ...angular.configs.tsRecommended.map(config => ({
    ...config,
    files: ['**/*.ts'],
  })),

  // 4. Angular Template Recommended (Scoped to .html only)
  ...angular.configs.templateRecommended.map(config => ({
    ...config,
    files: ['**/*.html'],
  })),
  ...angular.configs.templateAccessibility.map(config => ({
    ...config,
    files: ['**/*.html'],
  })),

  // 5. TypeScript Overrides
  {
    files: ['**/*.ts'],
    processor: angular.processInlineTemplates,
    plugins: {
      diabetactic: diabetacticRules,
    },
    rules: {
      'diabetactic/no-await-ionic-overlay-create': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      '@typescript-eslint/no-namespace': 'off',
      // CSS Pro: Avoid inline styles
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/style=/]',
          message: 'CSS Pro: Avoid inline styles. Use Tailwind classes instead.',
        },
      ],

      // Angular Best Practices
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',

      // Pragmatic Overrides
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // Pragmatic Relaxations
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-standalone': 'warn',
    },
  },

  // 6. HTML Overrides
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/label-has-associated-control': 'warn',
    },
  },

  // 7. Node.js Scripts & Configs Overrides
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,cjs,mjs}', 'proxy.conf.*.cjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off', // Often handled by globals, but sometimes needed if type-checking is off
      'no-unused-vars': 'off',
      'no-redeclare': 'warn', // Handle fetch redeclaration issues
    },
  },

  // 8. Test Files Overrides - more lenient for mocks and test utilities
  {
    files: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/setup-vitest.ts',
      '**/test-setup.ts',
      'e2e/**/*.ts',
      'playwright/**/*.ts',
      'src/app/tests/**/*.ts',
    ],
    rules: {
      'diabetactic/no-await-ionic-overlay-create': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Mocks often need flexible types
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@angular-eslint/prefer-standalone': 'off', // Test modules often use NgModule
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='toBeTrue']",
          message: 'Use toBe(true) instead of toBeTrue().',
        },
        {
          selector: "CallExpression[callee.property.name='toBeFalse']",
          message: 'Use toBe(false) instead of toBeFalse().',
        },
      ],
    },
  },

  // 9. Mocks & Test Scaffolding (avoid false positives)
  {
    files: ['src/mocks/**/*.ts', 'src/test-setup/**/*.ts'],
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  }
);
