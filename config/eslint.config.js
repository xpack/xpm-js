// https://typescript-eslint.io/packages/typescript-eslint/
// https://eslint.org/docs/latest/use/configure/configuration-files

// @ts-check

import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import path from 'node:path'
import tseslint from 'typescript-eslint'

export default tseslint.config({
  extends: [eslint.configs.recommended, prettierConfig],
  ignores: [],
  rules: {
    'max-len': [
      'warn',
      80,
      {
        ignoreUrls: true,
        ignorePattern:
          '^\\s*// eslint-disable-next-line|^\\s*// console\\.log|^\\s*//\\s*<xsd:|^\\s*import\\s+\\{[^}]+\\}\\s+from\\s+[\'"][^\'"]+[\'"]',
      },
    ],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      // Node.js globals
      Buffer: 'readonly',
      URL: 'readonly',
      URLSearchParams: 'readonly',
      console: 'readonly',
      process: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      setImmediate: 'readonly',
      clearImmediate: 'readonly',
      __dirname: 'readonly',
      __filename: 'readonly',
      global: 'readonly',
      exports: 'readonly',
      module: 'readonly',
      require: 'readonly',
    },
  },
})
