import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-unused-vars': 'off', // TypeScript版を使用
      'no-undef': 'off', // TypeScriptが型チェックを行うため
      // ロギングシステムが実装されているため、console.logの使用を制限
      // console.logのみを禁止し、Loggerクラスで使用する他のconsoleメソッドは許可
      'no-console':
        process.env.NODE_ENV === 'production'
          ? ['error', { allow: ['warn', 'error', 'info', 'debug'] }]
          : ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js'],
  },
];
