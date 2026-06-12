import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist', 'node_modules', 'uploads'] },

  // Plain JS files (configs, scripts)
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
  },

  // TypeScript
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // tsc already catches undefined identifiers; no-undef false-positives on TS types
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
];
