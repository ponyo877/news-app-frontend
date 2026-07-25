import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**'],
  },
  ...expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { sonarjs },
    rules: {
      // 必須要件: cognitive complexity <= 20
      'sonarjs/cognitive-complexity': ['error', 20],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      complexity: ['warn', 15],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['jest.setup.js', 'jest.config.js'],
    languageOptions: {
      globals: { jest: 'readonly', module: 'writable', require: 'readonly' },
    },
  },
  prettierConfig,
);
