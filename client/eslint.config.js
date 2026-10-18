import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly', document: 'readonly', console: 'readonly', localStorage: 'readonly',
        navigator: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        // Browser APIs used by animation / layout code (e.g. the upcoming Morph Gallery)
        setInterval: 'readonly', clearInterval: 'readonly',
        requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
        matchMedia: 'readonly', getComputedStyle: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
        Image: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        fetch: 'readonly', createImageBitmap: 'readonly', performance: 'readonly',
        AbortController: 'readonly',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: { react: { version: 'detect' } },
  },
];
